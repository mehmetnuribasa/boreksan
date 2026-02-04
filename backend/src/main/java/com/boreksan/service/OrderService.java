package com.boreksan.service;

import com.boreksan.dto.OrderItemRequest;
import com.boreksan.dto.OrderItemResponse;
import com.boreksan.dto.OrderRequest;
import com.boreksan.dto.OrderResponse;
import com.boreksan.entity.*;
import com.boreksan.entity.enums.OrderStatus;
import com.boreksan.entity.enums.Role;
import com.boreksan.exception.OrderTimeLimitException;
import com.boreksan.exception.ProductNotFoundException;
import com.boreksan.repository.OrderRepository;
import com.boreksan.repository.ProductRepository;
import com.boreksan.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import com.boreksan.dto.DailyOrderUpdateRequest; // Added import

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public OrderService(OrderRepository orderRepository, ProductRepository productRepository, UserRepository userRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    // --- YARDIMCI METODLAR (ÇEVİRİCİLER) ---
    
    // Entity -> OrderResponse Çevirici
    private OrderResponse mapToOrderResponse(Order order) {
        OrderResponse response = new OrderResponse();
        response.setId(order.getId());
        response.setCustomerName(order.getUser().getUsername());
        response.setShopName(order.getUser().getShopName());
        response.setAddress(order.getUser().getAddress());
        response.setPhone(order.getUser().getPhone());

        response.setTotalPrice(order.getTotalPrice());
        response.setStatus(order.getStatus());
        response.setCreatedAt(order.getCreatedAt());

        // İçindeki item'ları da tek tek çevir
        List<OrderItemResponse> itemResponses = order.getItems().stream()
                .map(this::mapToOrderItemResponse)
                .collect(Collectors.toList());
        
        response.setItems(itemResponses);
        return response;
    }

    // Entity -> OrderItemResponse Çevirici
    private OrderItemResponse mapToOrderItemResponse(OrderItem item) {
        OrderItemResponse response = new OrderItemResponse();
        response.setProductName(item.getProduct().getName());
        response.setQuantity(item.getQuantity());
        response.setUnitPrice(item.getUnitPrice());
        response.setSubTotal(item.getSubTotal()); // Ara toplamı hesapla
        return response;
    }


    // 1. SİPARİŞ OLUŞTUR
    @Transactional
    public OrderResponse createOrder(OrderRequest request) {
        
        // --- KURAL 1: SAAT KONTROLÜ (22:00 SINIRI) ---
        LocalTime now = LocalTime.now();
        LocalTime limit = LocalTime.of(22, 0); // Akşam 10
        
        // --- KURAL 2: KULLANICIYI BUL ---
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User loggedInUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Kullanıcı bulunamadı"));

        User targetUser = loggedInUser;
        
        // Eğer ADMIN ise ve request'te shopName varsa, o dükkan adına işlem yap
        if (loggedInUser.getRole() == Role.ADMIN && request.getShopName() != null && !request.getShopName().isEmpty()) {
            targetUser = userRepository.findByShopName(request.getShopName())
                    .or(() -> userRepository.findByUsername(request.getShopName())) // Belki username verilmiştir
                    .orElseThrow(() -> new UsernameNotFoundException("Belirtilen dükkan/kullanıcı bulunamadı: " + request.getShopName()));
        }

        // Admin değilse zaman kuralı geçerli olsun
        if (loggedInUser.getRole() != Role.ADMIN) {
             if (now.isAfter(limit)) {
                throw new OrderTimeLimitException("Günlük sipariş saati (22:00) dolmuştur. Lütfen yarın sipariş veriniz.");
            }
        }

        Order order = new Order();
        order.setUser(targetUser);
        order.setStatus(OrderStatus.WAITING);

        List<OrderItem> items = new ArrayList<>();
        double totalAmount = 0.0;

        // --- KURAL 3: KALEMLERİ OLUŞTUR (HEP TEPSİ) ---
        for (OrderItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ProductNotFoundException("Ürün bulunamadı ID: " + itemReq.getProductId()));

            // Pastaneler için her zaman TEPSİ fiyatını baz alıyoruz
            double price = product.getPriceTray();
            
            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setQuantity(itemReq.getQuantity());
            item.setUnitPrice(price);

            double subTotal = price * itemReq.getQuantity();
            item.setSubTotal(subTotal);

            totalAmount += subTotal;
            items.add(item);
        }

        order.setItems(items);
        order.setTotalPrice(totalAmount);

        Order savedOrder = orderRepository.save(order);

        return mapToOrderResponse(savedOrder);
    }

    // 2. SİPARİŞLERİ LİSTELE
    public List<OrderResponse> getAllOrders() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        List<Order> orders;
        if (user.getRole() == Role.ADMIN) {
            // Admin: Herkesin siparişini görsün
            orders = orderRepository.findAllByOrderByCreatedAtDesc(); 
        } else {
            // Pastane: Sadece kendi siparişini görsün
            orders = orderRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId());
        }

        return orders.stream()
                .map(this::mapToOrderResponse)
                .collect(Collectors.toList());
    }

    // 3. GÜNLÜK MİKTAR GÜNCELLE (Admin Yetkisi ile)
    @Transactional
    public void updateShopDailyQuantity(DailyOrderUpdateRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User adminUser = userRepository.findByUsername(username).orElseThrow();

        if (adminUser.getRole() != Role.ADMIN) {
            throw new RuntimeException("Bu işlemi sadece Admin yapabilir.");
        }

        User targetUser = userRepository.findByShopName(request.getShopName())
                .or(() -> userRepository.findByUsername(request.getShopName()))
                .orElseThrow(() -> new UsernameNotFoundException("Dükkan bulunamadı: " + request.getShopName()));

        java.time.LocalDateTime startOfDay = java.time.LocalDate.now().atStartOfDay();
        java.time.LocalDateTime endOfDay = java.time.LocalDate.now().atTime(23, 59, 59);

        // Bugünün siparişlerini bul
        List<Order> todayOrders = orderRepository.findAllByUserIdOrderByCreatedAtDesc(targetUser.getId()).stream()
                .filter(o -> o.getCreatedAt().isAfter(startOfDay) && o.getCreatedAt().isBefore(endOfDay))
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .collect(Collectors.toList());

        // Mevcut stoğu hesapla
        int currentTotal = todayOrders.stream()
                .flatMap(o -> o.getItems().stream())
                .filter(i -> i.getProduct().getId().equals(request.getProductId()))
                .mapToInt(OrderItem::getQuantity)
                .sum();

        int diff = request.getTargetQuantity() - currentTotal;
        if (diff == 0) return;

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ProductNotFoundException("Ürün bulunamadı"));

        if (diff > 0) {
            // Ekleme yap
            Order order = new Order();
            order.setUser(targetUser);
            order.setStatus(OrderStatus.WAITING);
            
            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setQuantity(diff);
            item.setUnitPrice(product.getPriceTray());
            item.setSubTotal(diff * item.getUnitPrice());
            
            List<OrderItem> items = new ArrayList<>();
            items.add(item);
            order.setItems(items);
            order.setTotalPrice(item.getSubTotal());
            
            orderRepository.save(order);
        } else {
            // Çıkarma yap (diff negatif)
            int toRemove = Math.abs(diff);

            // Eski siparişlerden başlayarak sil (LIFO daha mantıklı ama burada created desc geliyor yani YENİLER başta)
            // Eğer YENİ siparişi mi silmeliyiz, eskileri mi? Genelde son ekleneni silmek daha mantıklıdır (Undo gibi).
            // `todayOrders` ORDER BY CreatedAt DESC -> Yani index 0 en yeni sipariş.
            
            for (Order order : todayOrders) {
                if (toRemove <= 0) break;

                // Bu siparişteki ilgili ürünleri bul
                List<OrderItem> targetItems = order.getItems().stream()
                        .filter(i -> i.getProduct().getId().equals(request.getProductId()))
                        .collect(Collectors.toList());

                for (OrderItem item : targetItems) {
                    if (toRemove <= 0) break;

                    if (item.getQuantity() > toRemove) {
                        // Kısmi azalt
                        item.setQuantity(item.getQuantity() - toRemove);
                        item.setSubTotal(item.getQuantity() * item.getUnitPrice());
                        toRemove = 0;
                    } else {
                        // Tamamen sil
                        toRemove -= item.getQuantity();
                        order.getItems().remove(item);
                    }
                }

                // Sipariş boşaldıysa iptal et
                if (order.getItems().isEmpty()) {
                    order.setStatus(OrderStatus.CANCELLED);
                    order.setTotalPrice(0.0);
                } else {
                    double newTotal = order.getItems().stream().mapToDouble(OrderItem::getSubTotal).sum();
                    order.setTotalPrice(newTotal);
                }
                
                orderRepository.save(order);
            }
        }
    }

    // 3. Durum Güncelle (Sadece Admin)
    public OrderResponse updateOrderStatus(Long orderId, OrderStatus newStatus) {
        // Siparişi bul
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Sipariş bulunamadı!"));

        // Durumu değiştir ve kaydet
        order.setStatus(newStatus);
        Order updatedOrder = orderRepository.save(order);

        return mapToOrderResponse(updatedOrder);
    }
}