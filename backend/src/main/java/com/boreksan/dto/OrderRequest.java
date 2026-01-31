package com.boreksan.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;

@Data
public class OrderRequest {
    // Sadece liste gelir. Kimin sipariş verdiğini Token'dan anlayacağız.
    @Valid // Listenin İÇİNDEKİ OrderItemRequest kurallarını (Quantity, ProductId) çalıştırır.
    @NotEmpty(message = "Sipariş sepeti boş olamaz!") // Boş liste gönderilmesini engeller.
    private List<OrderItemRequest> items;
}