import 'package:flutter/material.dart';

class OrderItem {
  final int id;
  final String productName;
  final String? productImage;
  final String? category;
  final String? unit;
  final double price;
  final int qty;

  OrderItem({
    required this.id,
    required this.productName,
    this.productImage,
    this.category,
    this.unit,
    required this.price,
    required this.qty,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'] as int,
      productName: json['product_name'] as String? ?? '',
      productImage: json['product_image'] as String?,
      category: json['category'] as String?,
      unit: json['unit'] as String?,
      price: double.tryParse('${json['price']}') ?? 0,
      qty: json['qty'] as int? ?? 1,
    );
  }
}

class DeliveryAddress {
  final String name;
  final String phone;
  final String line1;
  final String? line2;
  final String city;
  final String state;
  final String pincode;

  DeliveryAddress({
    required this.name,
    required this.phone,
    required this.line1,
    this.line2,
    required this.city,
    required this.state,
    required this.pincode,
  });

  factory DeliveryAddress.fromJson(Map<String, dynamic> json) {
    return DeliveryAddress(
      name: json['name'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      line1: json['line1'] as String? ?? '',
      line2: json['line2'] as String?,
      city: json['city'] as String? ?? '',
      state: json['state'] as String? ?? '',
      pincode: json['pincode'] as String? ?? '',
    );
  }

  String get oneLine =>
      '$line1${line2 != null && line2!.isNotEmpty ? ', $line2' : ''}, $city, $state – $pincode';

  Map<String, dynamic> toJson() => {
        'name': name,
        'phone': phone,
        'line1': line1,
        if (line2 != null && line2!.isNotEmpty) 'line2': line2,
        'city': city,
        'state': state,
        'pincode': pincode,
      };

  bool get isComplete =>
      name.isNotEmpty && phone.replaceAll(RegExp(r'\D'), '').length >= 7 &&
      line1.isNotEmpty && city.isNotEmpty && state.isNotEmpty && pincode.length == 6;
}

class OrderModel {
  final int id;
  final String status; // placed | confirmed | shipped | delivered | cancelled
  final String paymentMethod;
  final DeliveryAddress deliveryAddress;
  final double subtotal;
  final double deliveryCharge;
  final double discount;
  final double total;
  final String? couponCode;
  final DateTime createdAt;
  final List<OrderItem> items;

  OrderModel({
    required this.id,
    required this.status,
    required this.paymentMethod,
    required this.deliveryAddress,
    required this.subtotal,
    required this.deliveryCharge,
    required this.discount,
    required this.total,
    this.couponCode,
    required this.createdAt,
    required this.items,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: json['id'] as int,
      status: json['status'] as String? ?? 'placed',
      paymentMethod: json['payment_method'] as String? ?? '',
      deliveryAddress: DeliveryAddress.fromJson(
          json['delivery_address'] as Map<String, dynamic>? ?? {}),
      subtotal: double.tryParse('${json['subtotal']}') ?? 0,
      deliveryCharge: double.tryParse('${json['delivery_charge']}') ?? 0,
      discount: double.tryParse('${json['discount']}') ?? 0,
      total: double.tryParse('${json['total']}') ?? 0,
      couponCode: json['coupon_code'] as String?,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
      items: ((json['items'] as List?) ?? [])
          .map((j) => OrderItem.fromJson(j as Map<String, dynamic>))
          .toList(),
    );
  }

  Color get statusColor {
    switch (status) {
      case 'delivered':
        return const Color(0xFF15803D);
      case 'shipped':
        return const Color(0xFF7C3AED);
      case 'confirmed':
        return const Color(0xFF2563EB);
      case 'cancelled':
        return const Color(0xFFDC2626);
      default:
        return const Color(0xFFD97706); // placed
    }
  }

  Color get statusBg {
    switch (status) {
      case 'delivered':
        return const Color(0xFFF0FDF4);
      case 'shipped':
        return const Color(0xFFF5F3FF);
      case 'confirmed':
        return const Color(0xFFEFF6FF);
      case 'cancelled':
        return const Color(0xFFFEF2F2);
      default:
        return const Color(0xFFFFFBEB);
    }
  }
}
