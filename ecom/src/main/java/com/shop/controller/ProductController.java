package com.shop.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RestController;

import com.shop.entity.Product;
import com.shop.service.ProductService;
import com.shop.service.ImageUploadService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.data.domain.Page;

@RestController
public class ProductController {

  private final ProductService ps;
  private final ImageUploadService imageService;

  public ProductController(ProductService ps, ImageUploadService imageService) {
    this.ps = ps;
    this.imageService = imageService;
  }

  @GetMapping("/productlist")
  public Page<Product> productlist(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "id") String sortBy,
      @RequestParam(defaultValue = "ASC") String direction,
      @RequestParam(defaultValue = "") String search) {
    return ps.listPro(page, size, sortBy, direction, search);
  }

  @PostMapping("/addproduct")
  public String addProduct(@RequestParam("name") String name,
      @RequestParam("description") String description,
      @RequestParam("price") float price,
      @RequestParam(value = "image", required = false) MultipartFile imageFile) throws Exception {

    Product p = new Product();
    p.setName(name);
    p.setDescription(description);
    p.setPrice(price);

    if (imageFile != null && !imageFile.isEmpty()) {
      try {
        String imageUrl = imageService.uploadImage(imageFile);
        p.setImage(imageUrl);
      } catch (Exception e) {
        System.out.println("Cloudinary error: " + e.getMessage());
        p.setImage("https://via.placeholder.com/200");
      }
    } else {
      p.setImage("https://via.placeholder.com/200");
    }

    return ps.addPro(p);
  }

  @DeleteMapping("/deleteproduct/{id}")
  public String deleteProduct(@PathVariable Long id) {
    ps.deletePro(id);
    return "deleted";
  }

}
