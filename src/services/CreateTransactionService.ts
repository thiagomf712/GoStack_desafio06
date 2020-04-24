import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: string;
  category: string;
}

class CreateTransactionService {
  public async execute({
    category,
    title,
    type,
    value,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    if (type !== 'income' && type !== 'outcome') {
      throw new AppError('type must be income or outcome');
    }

    const balance = await transactionsRepository.getBalance();

    if (type === 'outcome' && balance.total < value) {
      throw new AppError('insufficient money to withdraw', 400);
    }

    let categorydb = await categoriesRepository.findOne({
      where: { title: category },
    });

    if (!categorydb) {
      categorydb = categoriesRepository.create({
        title: category,
      });

      categorydb = await categoriesRepository.save(categorydb);
    }

    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category: categorydb,
    });

    const transactionCreated = await transactionsRepository.save(transaction);

    return transactionCreated;
  }
}

export default CreateTransactionService;
