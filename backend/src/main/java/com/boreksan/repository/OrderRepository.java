package com.boreksan.repository;

import com.boreksan.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    
    // Admin için: Tüm siparişleri tarihe göre getir (Yeniden eskiye)
    List<Order> findAllByOrderByCreatedAtDesc();

    // Müşteri (Pastane) için: Sadece kendi siparişlerini getir
    List<Order> findAllByUserIdOrderByCreatedAtDesc(Long userId);
}