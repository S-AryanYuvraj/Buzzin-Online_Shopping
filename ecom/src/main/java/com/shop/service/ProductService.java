package com.shop.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.shop.entity.Product;
import com.shop.repository.ProductRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@Service

public class ProductService {

    private final ProductRepository pr;

    public ProductService(ProductRepository pr) {
        this.pr = pr;
    }

    public String addPro(Product p) {
        pr.save(p);
        return "added";
    }

    public void deletePro(Long id) {
        pr.deleteById(id);
    }

    public Page<Product> listPro(int page, int size, String sortBy, String direction, String search) {
        Sort sort = direction.equalsIgnoreCase(Sort.Direction.ASC.name()) ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        if (search != null && !search.trim().isEmpty()) {
            return pr.findByNameContainingIgnoreCase(search, pageable);
        }

        return pr.findAll(pageable);
    }

}
