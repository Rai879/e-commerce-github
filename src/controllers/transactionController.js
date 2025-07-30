const TransactionModel = require('../models/transactionModel');
const ProductModel = require('../models/productModel');
const CustomerModel = require('../models/customerModel');

const TransactionController = {
  // Membuat transaksi baru
  createTransaction: async (req, res) => {
    const { customerId, items } = req.body;

    // Validasi input
    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Customer ID dan item transaksi wajib diisi' });
    }

    try {
      // Cek apakah customer ada
      const customer = await CustomerModel.findById(customerId);
      if (!customer) {
        return res.status(404).json({ message: 'Customer tidak ditemukan' });
      }

      let totalAmount = 0;
      const processedItems = [];

      // Cek setiap produk dan hitung total
      for (const item of items) {
        const product = await ProductModel.findById(item.productId);
        if (!product) {
          return res.status(404).json({ message: `Produk dengan ID ${item.productId} tidak ditemukan` });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({
            message: `Stok produk ${product.name} tidak mencukupi. Tersedia: ${product.stock}`
          });
        }

        totalAmount += product.price * item.quantity;
        processedItems.push({
          productId: product.id,
          quantity: item.quantity,
          pricePerItem: product.price
        });
      }

      // Buat transaksi
      const transactionId = await TransactionModel.createTransaction(customerId, totalAmount, 'pending');

      // Tambahkan item ke transaksi dan kurangi stok produk
      for (const item of processedItems) {
        await TransactionModel.addTransactionItem(
          transactionId,
          item.productId,
          item.quantity,
          item.pricePerItem
        );

        const product = await ProductModel.findById(item.productId);
        await ProductModel.update(item.productId, null, null, null, product.stock - item.quantity, null);
      }

      res.status(201).json({ message: 'Transaksi berhasil dibuat', transactionId });
    } catch (error) {
      console.error('Terjadi kesalahan saat membuat transaksi:', error);
      res.status(500).json({ message: 'Gagal membuat transaksi' });
    }
  },

  // Mengambil transaksi berdasarkan ID
  getTransactionById: async (req, res) => {
    const { id } = req.params;

    try {
      const transactionItems = await TransactionModel.findById(id);

      if (!transactionItems || transactionItems.length === 0) {
        return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
      }

      const transaction = {
        id: transactionItems[0].id,
        customer_id: transactionItems[0].customer_id,
        total_amount: transactionItems[0].total_amount,
        status: transactionItems[0].status,
        transaction_date: transactionItems[0].transaction_date,
        items: transactionItems.map(item => ({
          item_id: item.item_id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price_per_item: item.price_per_item
        }))
      };

      res.status(200).json(transaction);
    } catch (error) {
      console.error('Terjadi kesalahan saat mengambil transaksi:', error);
      res.status(500).json({ message: 'Gagal mengambil transaksi' });
    }
  },

  // Mengambil semua transaksi milik customer tertentu
  getTransactionsByCustomerId: async (req, res) => {
    const { customerId } = req.params;

    try {
      const transactionItems = await TransactionModel.findByCustomerId(customerId);

      if (!transactionItems || transactionItems.length === 0) {
        return res.status(404).json({ message: 'Tidak ada transaksi untuk customer ini' });
      }

      const transactionsMap = new Map();

      transactionItems.forEach(item => {
        if (!transactionsMap.has(item.id)) {
          transactionsMap.set(item.id, {
            id: item.id,
            customer_id: item.customer_id,
            total_amount: item.total_amount,
            status: item.status,
            transaction_date: item.transaction_date,
            items: []
          });
        }

        transactionsMap.get(item.id).items.push({
          item_id: item.item_id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price_per_item: item.price_per_item
        });
      });

      res.status(200).json(Array.from(transactionsMap.values()));
    } catch (error) {
      console.error('Kesalahan saat mengambil transaksi customer:', error);
      res.status(500).json({ message: 'Gagal mengambil transaksi customer' });
    }
  },

  // Mengubah status transaksi
  updateTransactionStatus: async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatus = ['pending', 'completed', 'cancelled'];

    if (!status || !allowedStatus.includes(status)) {
      return res.status(400).json({ message: 'Status tidak valid' });
    }

    try {
      const affectedRows = await TransactionModel.updateStatus(id, status);

      if (affectedRows === 0) {
        return res.status(404).json({ message: 'Transaksi tidak ditemukan atau tidak ada perubahan' });
      }

      res.status(200).json({ message: 'Status transaksi berhasil diperbarui' });
    } catch (error) {
      console.error('Kesalahan saat memperbarui status transaksi:', error);
      res.status(500).json({ message: 'Gagal memperbarui status transaksi' });
    }
  },

  // Menghapus transaksi berdasarkan ID
  deleteTransaction: async (req, res) => {
    const { id } = req.params;

    try {
      const affectedRows = await TransactionModel.delete(id);

      if (affectedRows === 0) {
        return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
      }

      res.status(200).json({ message: 'Transaksi berhasil dihapus' });
    } catch (error) {
      console.error('Kesalahan saat menghapus transaksi:', error);
      res.status(500).json({ message: 'Gagal menghapus transaksi' });
    }
  },

  // Mengambil semua transaksi
  getAllTransactions: async (req, res) => {
    try {
      const transactionItems = await TransactionModel.getAll();

      if (!transactionItems || transactionItems.length === 0) {
        return res.status(200).json([]); // Tidak ada transaksi
      }

      const transactionsMap = new Map();

      transactionItems.forEach(item => {
        if (!transactionsMap.has(item.id)) {
          transactionsMap.set(item.id, {
            id: item.id,
            customer_id: item.customer_id,
            total_amount: item.total_amount,
            status: item.status,
            transaction_date: item.transaction_date,
            items: []
          });
        }

        transactionsMap.get(item.id).items.push({
          item_id: item.item_id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price_per_item: item.price_per_item
        });
      });

      res.status(200).json(Array.from(transactionsMap.values()));
    } catch (error) {
      console.error('Kesalahan saat mengambil semua transaksi:', error);
      res.status(500).json({ message: 'Gagal mengambil semua transaksi' });
    }
  }
};

module.exports = TransactionController;
