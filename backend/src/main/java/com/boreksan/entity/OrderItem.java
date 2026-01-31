package com.boreksan.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "order_id")
    @JsonIgnore // Sonsuz döngüye girmesin diye JSON'da gösterme
    private Order order;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    private Integer quantity; // Kaç Tepsi?

    private Double unitPrice; // O anki tepsi fiyatı (Tarihçesi kalsın diye)

    private Double subTotal; // Ara toplam (Adet * Fiyat)
}