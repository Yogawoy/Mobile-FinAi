import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createCategoryHandler,
  deleteCategoryHandler,
  listCategoriesHandler,
  updateCategoryHandler,
} from './categories.controller';
import {
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from './categories.schema';

const categoriesRouter = Router();

categoriesRouter.use(authenticate);

categoriesRouter.get('/', listCategoriesHandler);
categoriesRouter.post('/', validate({ body: createCategorySchema }), createCategoryHandler);
categoriesRouter.put(
  '/:id',
  validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
  updateCategoryHandler
);
categoriesRouter.delete(
  '/:id',
  validate({ params: categoryIdParamSchema }),
  deleteCategoryHandler
);

export { categoriesRouter };
