
import prisma from '../../config/prisma.js';
import redisClient  from '../../config/redis.js';

class CategoryRecommendationService {
  /**
   * To save the category tree in Redis cache for faster access, we first check if it's already cached. If not, we fetch it from the database and store it in Redis for future requests.
   */
  async getCategoryTree() {
    const cacheKey = 'category_tree';

    // 1. To check if the category tree is already cached in Redis
    const cachedTree = await redisClient.get(cacheKey);
    if (cachedTree) {
      return JSON.parse(cachedTree);
    }

    // 2. If not cached, fetch the category tree from the database
    const categories = await prisma.category.findMany({
      include: { children: true },
    });

    // 3. Save the fetched category tree in Redis cache with an expiration time of 1 hour (3600 seconds)
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(categories));

    return categories;
  }

  /**
   * This method performs a Depth-First Search (DFS) to collect all category IDs starting from the given categoryId. It recursively traverses through the children of each category and accumulates their IDs in the resultIds array. 
   */
  dfsCollectCategoryIds(categoryId, categoryMap, resultIds = []) {
    resultIds.push(categoryId);

    const category = categoryMap.get(categoryId);
    if (category && category.children && category.children.length > 0) {
      for (const child of category.children) {
        // DFS Recursive Call
        this.dfsCollectCategoryIds(child.id, categoryMap, resultIds);
      }
    }

    return resultIds;
  }

  /**
   * This method performs a Depth-First Search (DFS) to collect all category IDs starting from the given categoryId. It recursively traverses through the children of each category and accumulates their IDs in the resultIds array. 
   */
  async getRecommendedProducts(categoryId, limit = 10) {
    const categories = await this.getCategoryTree();

    // To Map Fast Lookups Data Structure
    const categoryMap = new Map();
    categories.forEach((cat) => categoryMap.set(cat.id, cat));

    // Collecting all category IDs starting from the given categoryId using DFS
    const targetCategoryIds = this.dfsCollectCategoryIds(
      parseInt(categoryId),
      categoryMap,
      []
    );

    // Fetching products based on the collected category IDs
    const recommendedProducts = await prisma.product.findMany({
      where: {
        categoryId: { in: targetCategoryIds },
        status: 'active',
        stock: { gt: 0 },
      },
      take: limit,
      include: { category: true },
    });

    return {
      searchedCategoryId: categoryId,
      includedCategoryIds: targetCategoryIds,
      products: recommendedProducts,
    };
  }
}

export default new CategoryRecommendationService();