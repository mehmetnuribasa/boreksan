package com.boreksan.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ProductRequest {
    // No ID! Because the database generates the ID, the user cannot input it.

    @NotBlank(message = "Name cannot be blank")
    private String name;

    @Size(max = 500, message = "Description cannot be too long!")
    private String description;

    @NotNull(message = "Price for portion must be provided!")
    @Min(value = 0, message = "Price cannot be negative!")
    private Double pricePortion;

    @NotNull(message = "Price for tray must be provided!")
    @Min(value = 0, message = "Price cannot be negative!")
    private Double priceTray;
}