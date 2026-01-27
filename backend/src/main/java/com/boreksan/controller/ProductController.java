package com.boreksan.controller;

import com.boreksan.dto.ProductResponse;
import com.boreksan.dto.ProductRequest;
import com.boreksan.dto.ProductUpdateRequest;
import com.boreksan.service.ProductService;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    // Constructor Injection
    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    // 1. Get All
    @GetMapping
    public List<ProductResponse> getAllProducts() {
        return productService.getAllProducts();
    }

    // 2. Create
    @PostMapping
    public ProductResponse createProduct(@Valid @RequestBody ProductRequest request) {
        return productService.createProduct(request);
    }

    // 3. Get One
    @GetMapping("/{id}")
    public ProductResponse getProductById(@PathVariable Long id) {
        return productService.getProductById(id);
    }

    // 4. Update (Put)
    @PutMapping("/{id}")
    public ProductResponse updateProduct(@PathVariable Long id, @Valid @RequestBody ProductUpdateRequest newProductInfo) {
        return productService.updateProduct(id, newProductInfo);
    }

    // 5. Delete
    @DeleteMapping("/{id}")
    public String deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return "Product successfully deleted! ID: " + id;
    }
}