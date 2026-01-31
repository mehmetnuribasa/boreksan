package com.boreksan.controller;

import com.boreksan.dto.OrderRequest;
import com.boreksan.dto.OrderResponse;
import com.boreksan.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // Sipariş Ver
    @PostMapping
    public OrderResponse placeOrder(@Valid @RequestBody OrderRequest request) {
        return orderService.createOrder(request);
    }

    // Siparişlerim / Sipariş Listesi
    @GetMapping
    public List<OrderResponse> getOrders() {
        return orderService.getAllOrders();
    }
}