package com.boreksan.service;

import com.boreksan.dto.ProductRequest;
import com.boreksan.dto.ProductUpdateRequest;
import com.boreksan.dto.ProductResponse;
import com.boreksan.entity.Product;
import com.boreksan.exception.ProductNotFoundException;
import com.boreksan.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    // --- HELPER METHODS (CONVERTERS) ---
    // Entity -> DTO Converter
    private ProductResponse mapToResponse(Product product) {
        ProductResponse response = new ProductResponse();
        response.setId(product.getId());
        response.setName(product.getName());
        response.setDescription(product.getDescription());
        response.setPricePortion(product.getPricePortion());
        response.setPriceTray(product.getPriceTray());
        return response;
    }

    // DTO -> Entity Converter
    private Product mapToEntity(ProductRequest request) {
        Product product = new Product();
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPricePortion(request.getPricePortion());
        product.setPriceTray(request.getPriceTray());
        return product;
    }

    // --- MAIN OPERATIONS ---

    // 1. Get All
    public List<ProductResponse> getAllProducts() {
        return productRepository.findAll()
                .stream()
                .map(this::mapToResponse) // Convert each product to a Response
                .collect(Collectors.toList());
    }

    // 2. Create
    public ProductResponse createProduct(ProductRequest request) {
        Product product = mapToEntity(request); // Convert the request to an Entity
        Product savedProduct = productRepository.save(product); // Save it
        return mapToResponse(savedProduct); // Convert the result to a Response and return
    }

    // 3. Get One
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException("Product not found with id: " + id));
        return mapToResponse(product);
    }

    // 4. Update
    public ProductResponse updateProduct(Long id, ProductUpdateRequest request) {
        Product existingProduct = productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException("Product not found with id: " + id));

        // Update logic
        if (request.getName() != null) existingProduct.setName(request.getName());
        if (request.getDescription() != null) existingProduct.setDescription(request.getDescription());
        if (request.getPricePortion() != null) existingProduct.setPricePortion(request.getPricePortion());
        if (request.getPriceTray() != null) existingProduct.setPriceTray(request.getPriceTray());

        Product updatedProduct = productRepository.save(existingProduct);
        return mapToResponse(updatedProduct);
    }

    // 5. Delete
    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new ProductNotFoundException("Product not found with id: " + id);
        }
        productRepository.deleteById(id);
    }
}