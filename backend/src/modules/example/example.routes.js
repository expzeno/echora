import { Router } from 'express';
import { handle } from '../../shared/utils/handle.js';
import { validate } from '../../shared/middleware/validate.js';
import { ExampleService } from './ExampleService.js';
// import { exampleSchema } from './example.schema.js';

const router = Router();

router.get('/', handle(ExampleService.list));
router.get('/:id', handle(ExampleService.getById, { paramOrder: ['id'] }));
// router.post('/', validate(exampleSchema), handle(ExampleService.create));

export const exampleRoutes = router;
