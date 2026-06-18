import { Router } from 'express';
import {
  getCategories, getCategoryById, createCategory, updateCategory, deleteCategory, moveCategory,
} from '../controllers/itemCategoryController.js';
import {
  getItems, getItemById, createItem, updateItem, deleteItem, moveItem,
} from '../controllers/itemController.js';

const router = Router();

// 大項目 CRUD
router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);
router.patch('/:id/sort', moveCategory);

// 小項目 CRUD（大項目ネスト）
router.get('/:categoryId/items', getItems);
router.get('/:categoryId/items/:itemId', getItemById);
router.post('/:categoryId/items', createItem);
router.put('/:categoryId/items/:itemId', updateItem);
router.delete('/:categoryId/items/:itemId', deleteItem);
router.patch('/:categoryId/items/:itemId/sort', moveItem);

export default router;
