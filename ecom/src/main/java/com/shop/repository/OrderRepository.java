package com.shop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.shop.entity.Order;
import com.shop.entity.User;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUser(User user);
    Order findByRazorpayOrderId(String razorpayOrderId);
}
