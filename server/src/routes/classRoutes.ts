import express from 'express';
import {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass
} from '../controllers/classController';

const router = express.Router();

// Get all classes
router.get('/', getAllClasses);

// Get single class
router.get('/:id', getClassById);

// Create class
router.post('/', createClass);

// Update class
router.put('/:id', updateClass);

// Delete class
router.delete('/:id', deleteClass);

export default router;