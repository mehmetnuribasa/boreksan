package com.boreksan.dto;

import com.boreksan.entity.enums.OrderStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class OrderResponse {
    private Long id;
    private String customerName; // sadece isim var!
    private Double totalPrice;
    private OrderStatus status;
    private LocalDateTime createdAt;
    
    private List<OrderItemResponse> items; // Temizlenmiş ürün listesi
}