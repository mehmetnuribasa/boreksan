package com.boreksan.entity;

import com.boreksan.entity.enums.OrderStatus;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "orders") // "order" SQL'de özel kelime olduğu için "orders" yapıyoruz
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Siparişi veren Pastane (User tablosuna bağlı)
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private Double totalPrice; // Toplam Tutar (Backend hesaplayacak)

    @Enumerated(EnumType.STRING)
    private OrderStatus status = OrderStatus.WAITING; // Varsayılan: Bekliyor

    @CreationTimestamp
    private LocalDateTime createdAt;

    // Siparişin içindeki kalemler (OrderItem tablosuna bağlı)
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    private List<OrderItem> items;
}