package com.boreksan.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProductUpdateRequest {
    
    // No @NotBlank! Because the name may not change and can be null.
    private String name;

    @Size(max = 500, message = "Description cannot be too long!")
    private String description;
    
    // No @NotNull! Because the price may not change and can be null.
    @Min(value = 0, message = "Price cannot be negative!")
    private Double pricePortion;

    @Min(value = 0, message = "Price cannot be negative!")
    private Double priceTray;
}