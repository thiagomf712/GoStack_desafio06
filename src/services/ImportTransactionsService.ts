import fs from 'fs';
import csvParse from 'csv-parse';
import { getCustomRepository, getRepository } from 'typeorm';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  csvPath: string;
}

interface TransictionParsedModel {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ csvPath }: Request): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const csvStream = fs.createReadStream(csvPath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = csvStream.pipe(parseStream);

    const transactionsParsed: TransictionParsedModel[] = [];

    parseCSV.on('data', (transaction) => {
      const title = transaction[0];
      const type = transaction[1];
      const value = Number(transaction[2]);
      const category = transaction[3];

      transactionsParsed.push({ category, title, type, value });
    });

    await new Promise((resolve) => {
      parseCSV.on('end', resolve);
    });

    const transactionsToCreate: Transaction[] = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const transaction of transactionsParsed) {
      const { category, title, type, value } = transaction;

      // eslint-disable-next-line no-await-in-loop
      let categorydb = await categoriesRepository.findOne({
        where: { title: category },
      });

      if (!categorydb) {
        categorydb = categoriesRepository.create({
          title: category,
        });

        // eslint-disable-next-line no-await-in-loop
        categorydb = await categoriesRepository.save(categorydb);
      }

      const transactionToCreate = transactionsRepository.create({
        category: categorydb,
        title,
        type,
        value,
      });

      transactionsToCreate.push(transactionToCreate);
    }

    const transactions = await transactionsRepository.save(
      transactionsToCreate,
    );

    await fs.promises.unlink(csvPath); // Excluir o arquivo

    return transactions;
  }
}

export default ImportTransactionsService;
