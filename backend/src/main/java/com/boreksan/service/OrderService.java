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
        
        if (now.isAfter(limit)) {
            throw new OrderTimeLimitException("Günlük sipariş saati (22:00) dolmuştur. Lütfen yarın sipariş veriniz.");
        }

        // --- KURAL 2: KULLANICIYI BUL ---
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Kullanıcı bulunamadı"));

        Order order = new Order();
        order.setUser(user);
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