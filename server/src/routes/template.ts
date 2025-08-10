import { Router } from 'express';
import templateController from '../controllers/templateController';

const router = Router();

// Create template
router.post('/', templateController.createTemplate);

// Get template list
router.get('/', templateController.getTemplates);

// Get specific template
router.get('/:id', templateController.getTemplateById);

// Update template
router.put('/:id', templateController.updateTemplate);

// Delete template
router.delete('/:id', templateController.deleteTemplate);

// Set default template
router.post('/:id/default', templateController.setDefaultTemplate);

// Get default template for module
router.get('/default/:module', templateController.getDefaultTemplate);

export default router;