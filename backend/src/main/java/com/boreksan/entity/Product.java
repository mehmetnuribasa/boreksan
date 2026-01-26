package com.boreksan.entity;

import jakarta.persistence.*; // Spring'in veritabanı sihirbazı
import lombok.Data;          // Getter/Setter yazmamak için

@Data   // Lombok: Bize otomatik getter, setter, toString vs. üretir.
@Entity // Spring: "Hey, bu sınıf aslında bir Veritabanı Tablosudur!"
@Table(name = "products") // Veritabanındaki tablo adı "products" olsun.
public class Product {

    @Id // Bu sütun kimlik kartıdır (Primary Key).
    @GeneratedValue(strategy = GenerationType.IDENTITY) // 1, 2, 3 diye otomatik artsın.
    private Long id;

    private String name;        // Ürün Adı (Kıymalı Börek)

    private Double price;       // Fiyatı

    private String description; // Açıklama

    @Column(name = "is_public") // Veritabanında "is_public" diye yazılsın.
    private boolean isPublic;   // Vitrinde görünecek mi?
}