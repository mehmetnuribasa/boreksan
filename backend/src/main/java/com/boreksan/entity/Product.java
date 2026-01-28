package com.boreksan.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;

    @Column(name = "price_portion")
    private Double pricePortion;

    @Column(name = "price_tray")
    private Double priceTray;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}