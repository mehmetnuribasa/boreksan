package com.boreksan.dto;

import lombok.Data;

@Data
public class ProductResponse {
    private Long id;
    private String name;
    private String description;
    private Double pricePortion;
    private Double priceTray;
}