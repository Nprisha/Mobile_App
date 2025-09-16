// Firestore database operations
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';

// Collection references
export const COLLECTIONS = {
  USERS: 'users',
  STATEMENTS: 'statements',
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  EXPORT_LOGS: 'exportLogs',
};

// Generic CRUD operations
export const createDocument = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
};

export const updateDocument = async (collectionName, docId, data) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
};

export const deleteDocument = async (collectionName, docId) => {
  try {
    await deleteDoc(doc(db, collectionName, docId));
    return { success: true };
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
};

export const getDocument = async (collectionName, docId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { 
        success: true, 
        data: { id: docSnap.id, ...docSnap.data() }
      };
    } else {
      return { success: false, error: 'Document not found' };
    }
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
};

// Statement operations
export const saveStatement = async (userId, statementData) => {
  try {
    const statement = {
      userId,
      fileName: statementData.fileName,
      fileSize: statementData.fileSize,
      fileUrl: statementData.fileUrl,
      bankName: statementData.bankName,
      accountNumber: statementData.accountNumber,
      statementPeriod: statementData.statementPeriod,
      totalTransactions: statementData.totalTransactions,
      status: 'processed', // pending, processing, processed, error
      processingTime: statementData.processingTime,
      metadata: statementData.metadata || {},
    };

    return await createDocument(COLLECTIONS.STATEMENTS, statement);
  } catch (error) {
    console.error('Error saving statement:', error);
    return { success: false, error: error.message };
  }
};

export const getUserStatements = async (userId, limitCount = 10) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.STATEMENTS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const statements = [];
    
    querySnapshot.forEach((doc) => {
      statements.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: statements };
  } catch (error) {
    console.error('Error getting user statements:', error);
    return { success: false, error: error.message };
  }
};

// Transaction operations
export const saveTransactions = async (statementId, transactions) => {
  try {
    const batch = writeBatch(db);
    
    transactions.forEach((transaction) => {
      const transactionRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
      batch.set(transactionRef, {
        statementId,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type, // credit, debit
        category: transaction.category,
        subcategory: transaction.subcategory,
        balance: transaction.balance,
        reference: transaction.reference,
        isRecurring: transaction.isRecurring || false,
        tags: transaction.tags || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    return { success: true, count: transactions.length };
  } catch (error) {
    console.error('Error saving transactions:', error);
    return { success: false, error: error.message };
  }
};

export const getTransactionsByStatement = async (statementId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.TRANSACTIONS),
      where('statementId', '==', statementId),
      orderBy('date', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const transactions = [];
    
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: transactions };
  } catch (error) {
    console.error('Error getting transactions:', error);
    return { success: false, error: error.message };
  }
};

export const getUserTransactions = async (userId, filters = {}) => {
  try {
    // First get user statements
    const statementsResult = await getUserStatements(userId, 100);
    if (!statementsResult.success) {
      return statementsResult;
    }

    const statementIds = statementsResult.data.map(stmt => stmt.id);
    
    if (statementIds.length === 0) {
      return { success: true, data: [] };
    }

    // Build query with filters
    let q = query(
      collection(db, COLLECTIONS.TRANSACTIONS),
      where('statementId', 'in', statementIds.slice(0, 10)), // Firestore limit
      orderBy('date', 'desc')
    );

    // Apply additional filters
    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }

    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }

    const querySnapshot = await getDocs(q);
    const transactions = [];
    
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: transactions };
  } catch (error) {
    console.error('Error getting user transactions:', error);
    return { success: false, error: error.message };
  }
};

// Category operations
export const updateTransactionCategory = async (transactionId, category, subcategory) => {
  try {
    return await updateDocument(COLLECTIONS.TRANSACTIONS, transactionId, {
      category,
      subcategory,
    });
  } catch (error) {
    console.error('Error updating transaction category:', error);
    return { success: false, error: error.message };
  }
};

// Export log operations
export const logExport = async (userId, exportData) => {
  try {
    const exportLog = {
      userId,
      exportType: exportData.exportType, // csv, excel, pdf
      format: exportData.format,
      filters: exportData.filters,
      recordCount: exportData.recordCount,
      fileSize: exportData.fileSize,
      downloadUrl: exportData.downloadUrl,
    };

    return await createDocument(COLLECTIONS.EXPORT_LOGS, exportLog);
  } catch (error) {
    console.error('Error logging export:', error);
    return { success: false, error: error.message };
  }
};
