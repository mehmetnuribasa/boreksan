package com.boreksan.repository;

import com.boreksan.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    // Burası şimdilik boş kalabilir.
    // JpaRepository sayesinde "save", "findAll", "delete" gibi
    // yüzlerce SQL komutu otomatik olarak arkada yazıldı bile!
}