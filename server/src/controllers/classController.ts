import { Request, Response } from 'express';
import { databaseService } from '../services/databaseService';
import { v4 as uuidv4 } from 'uuid';

// Class information interface
interface ClassInfo {
  id: string;
  name: string;
  color?: string; // Class color
}

/**
 * Get all classes
 */
export const getAllClasses = async (req: Request, res: Response) => {
  try {
    const classes = await databaseService.getCache('classes') || [];
    
    return res.json({
      success: true,
      data: classes,
      message: 'Successfully retrieved class list'
    });
  } catch (error) {
    console.error('Failed to get class list:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get class list'
    });
  }
};

/**
 * Get single class
 */
export const getClassById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    const classes = await databaseService.getCache('classes') || [];
    const classInfo = classes.find((c: ClassInfo) => c.id === id);
    
    if (!classInfo) {
      return res.status(404).json({
        success: false,
        error: 'Class does not exist'
      });
    }
    
    return res.json({
      success: true,
      data: classInfo,
      message: 'Successfully retrieved class'
    });
  } catch (error) {
    console.error('Failed to get class:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get class'
    });
  }
};

/**
 * Create class
 */
export const createClass = async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    const classes = await databaseService.getCache('classes') || [];
    
    // Check if class with same name already exists
    const existingClass = classes.find(
      (c: ClassInfo) => c.name === name);
    
    if (existingClass) {
      return res.status(400).json({
        success: false,
        error: 'Class name already exists'
      });
    }
    
    const newClass: ClassInfo = {
      id: uuidv4(),
      name,
      ...(color && { color }), // Only add color to object when it exists
    };
    
    const updatedClasses = [...classes, newClass];
    await databaseService.setCache('classes', updatedClasses, 0); // Permanent storage
    
    return res.status(201).json({
      success: true,
      data: newClass,
      message: 'Class created successfully'
    });
  } catch (error) {
    console.error('Failed to create class:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create class'
    });
  }
};

/**
 * Update class
 */
export const updateClass = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { name, color } = req.body;
    
    if (!id || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    const classes = await databaseService.getCache('classes') || [];
    const classIndex = classes.findIndex((c: ClassInfo) => c.id === id);
    
    if (classIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Class does not exist'
      });
    }
    
    // Check if name conflicts with other classes
    const nameExists = classes.some(
      (c: ClassInfo) => c.id !== id && (c.name === name)
    );
    
    if (nameExists) {
      return res.status(400).json({
        success: false,
        error: 'Class name already exists'
      });
    }
    
    const updatedClass: ClassInfo = {
      id,
      name,
      ...(color && { color }), // Only add color to object when it exists
    };
    
    const updatedClasses = [...classes];
    updatedClasses[classIndex] = updatedClass;
    
    await databaseService.setCache('classes', updatedClasses, 0); // Permanent storage
    
    return res.json({
      success: true,
      data: updatedClass,
      message: 'Class updated successfully'
    });
  } catch (error) {
    console.error('Failed to update class:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update class'
    });
  }
};

/**
 * Delete class
 */
export const deleteClass = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    const classes = await databaseService.getCache('classes') || [];
    const classIndex = classes.findIndex((c: ClassInfo) => c.id === id);
    
    if (classIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Class does not exist'
      });
    }
    
    const updatedClasses = classes.filter((c: ClassInfo) => c.id !== id);
    await databaseService.setCache('classes', updatedClasses, 0); // Permanent storage
    
    return res.json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete class:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete class'
    });
  }
};

/**
 * Initialize default class data
 */
export const initializeDefaultClasses = async () => {
  try {
    // Check if class data already exists
    const existingClasses = await databaseService.getCache('classes');
    if (existingClasses && existingClasses.length > 0) {
      console.log('Class data already exists, skipping initialization');
      return;
    }
    
    // Default class data
    const defaultClasses: ClassInfo[] = [
      { id: uuidv4(), name: 'High Priest', color: '#F4E4BC' }, // Light gold
      { id: uuidv4(), name: 'Champion', color: '#D4AF37' }, // Gold
      { id: uuidv4(), name: 'Sniper', color: '#90EE90' }, // Light green
      { id: uuidv4(), name: 'Gypsy', color: '#DDA0DD' }, // Plum
      { id: uuidv4(), name: 'Clown', color: '#FFB6C1' }, // Light pink
      { id: uuidv4(), name: 'High Wizard', color: '#87CEEB' }, // Sky blue
      { id: uuidv4(), name: 'Professor', color: '#B0C4DE' }, // Light steel blue
      { id: uuidv4(), name: 'Lord Knight', color: '#F08080' }, // Light coral
      { id: uuidv4(), name: 'Paladin', color: '#FFB347' }, // Peach
      { id: uuidv4(), name: 'Whitesmith', color: '#98FB98' }, // Pale green
      { id: uuidv4(), name: 'Creator', color: '#AFEEEE' }, // Pale turquoise
      { id: uuidv4(), name: 'Assassin Cross', color: '#DDA0DD' }, // Plum
      { id: uuidv4(), name: 'Stalker', color: '#E6E6FA' }, // Lavender
    ];
    
    await databaseService.setCache('classes', defaultClasses, 0); // Permanent storage
    console.log('Default class data initialization successful');
  } catch (error) {
    console.error('Failed to initialize default class data:', error);
  }
};