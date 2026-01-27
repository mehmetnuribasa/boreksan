package com.boreksan.entity;

import jakarta.persistence.*;
import lombok.Data;

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
}