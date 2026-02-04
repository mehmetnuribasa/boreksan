package com.boreksan.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DailyOrderUpdateRequest {
    @NotNull
    private String shopName;
    
    @NotNull
    private Long productId;
    
    @NotNull
    @Min(value = 0, message = "Miktar 0'dan küçük olamaz")
    private Integer targetQuantity;
}
