import prisma from '../config/prisma.js';

import CategoryRecommendationService from '../services/recommendation/categoryDFS.js';

const createProduct = async (req, res) => {
  try {
    const { name, sku, description, price, stock, categoryId } = req.body;
    const product = await prisma.product.create({
      data: { name, sku, description, price: parseFloat(price), stock: parseInt(stock), categoryId: parseInt(categoryId) }
    });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({ include: { category: true } });
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRecommendations = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const recommendations = await CategoryRecommendationService.getRecommendedProducts(categoryId);
    res.status(200).json({ success: true, data: recommendations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default { createProduct, getProducts, getRecommendations };