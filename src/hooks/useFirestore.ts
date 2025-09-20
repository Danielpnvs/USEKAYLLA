import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Detect current role from localStorage
function getCurrentUserRole(): 'admin' | 'user' | 'viewer' | null {
  try {
    const raw = localStorage.getItem('usekaylla_user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.role ?? null;
  } catch {
    return null;
  }
}

// Demo datasets for viewer mode (lightweight and generic)
function getDemoData(collectionName: string): any[] {
  // Allow overriding via localStorage for easier manual tweaks
  try {
    const override = localStorage.getItem(`usekaylla_demo_data_${collectionName}`);
    if (override) {
      const parsed = JSON.parse(override);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  if (collectionName === 'clothing') {
    return [
      // 1. Blusa Básica - 3 variações
      {
        id: 'demo-CL-1',
        code: 'BLU-001',
        name: 'Blusa Básica',
        description: 'Blusa de algodão 100% com corte clássico',
        category: 'Blusas',
        brand: 'Kaylla Fashion',
        supplier: 'Moda & Estilo Ltda',
        costPrice: 28.00,
        freightPerUnit: 2.80,
        packagingCost: 1.20,
        baseCost: 32.00,
        creditFeePercent: 3.5,
        creditFeeAmount: 1.12,
        salePrice: 59.90,
        sellingPrice: 59.90,
        profit: 26.78,
        status: 'available',
        createdAt: new Date('2024-12-01'),
        updatedAt: new Date('2025-01-10'),
        variations: [
          { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Branco', quantity: 2, soldQuantity: 1 },
          { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Preto', quantity: 1, soldQuantity: 2 },
          { id: 'v3', size: { label: 'P', value: 'P' }, color: 'Azul', quantity: 3, soldQuantity: 0 }
        ]
      },
      // 2. Calça Jeans Skinny - 4 variações
      {
        id: 'demo-CL-2',
        code: 'CAL-002',
        name: 'Calça Jeans Skinny',
        description: 'Calça jeans skinny com elastano para conforto',
        category: 'Calças',
        brand: 'Kaylla Fashion',
        supplier: 'Jeans Brasil Confecções',
        costPrice: 45.00,
        freightPerUnit: 4.50,
        packagingCost: 2.00,
        baseCost: 51.50,
        creditFeePercent: 3.5,
        creditFeeAmount: 1.80,
        salePrice: 89.90,
        sellingPrice: 89.90,
        profit: 36.60,
        status: 'available',
        createdAt: new Date('2024-12-02'),
        updatedAt: new Date('2025-01-11'),
        variations: [
          { id: 'v1', size: { label: '38', value: '38' }, color: 'Azul', quantity: 1, soldQuantity: 1 },
          { id: 'v2', size: { label: '40', value: '40' }, color: 'Azul', quantity: 0, soldQuantity: 2 },
          { id: 'v3', size: { label: '42', value: '42' }, color: 'Preto', quantity: 2, soldQuantity: 0 },
          { id: 'v4', size: { label: '38', value: '38' }, color: 'Branco', quantity: 1, soldQuantity: 1 }
        ]
      },
      // 3. Vestido Elegante - 2 variações
      {
        id: 'demo-CL-3',
        code: 'VES-003',
        name: 'Vestido Elegante',
        description: 'Vestido elegante para ocasiões especiais',
        category: 'Vestidos',
        brand: 'Kaylla Fashion',
        supplier: 'Elegance Fashion Group',
        costPrice: 65.00,
        freightPerUnit: 6.50,
        packagingCost: 3.00,
        baseCost: 74.50,
        creditFeePercent: 3.5,
        creditFeeAmount: 2.61,
        salePrice: 129.90,
        sellingPrice: 129.90,
        profit: 52.79,
        status: 'available',
        createdAt: new Date('2024-12-03'),
        updatedAt: new Date('2025-01-12'),
        variations: [
          { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Preto', quantity: 0, soldQuantity: 1 },
          { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Vermelho', quantity: 1, soldQuantity: 1 }
        ]
      },
      // 4. Saia Midi Floral - 3 variações
      {
        id: 'demo-CL-4',
        code: 'SAI-004',
        name: 'Saia Midi Floral',
        description: 'Saia midi com estampa floral delicada',
        category: 'Saias',
        brand: 'Kaylla Fashion',
        supplier: 'Moda & Estilo Ltda',
        costPrice: 35.00,
        freightPerUnit: 3.50,
        packagingCost: 1.50,
        baseCost: 40.00,
        creditFeePercent: 3.5,
        creditFeeAmount: 1.40,
        salePrice: 79.90,
        sellingPrice: 79.90,
        profit: 38.50,
        status: 'available',
        createdAt: new Date('2024-12-04'),
        updatedAt: new Date('2025-01-13'),
        variations: [
          { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Branco', quantity: 2, soldQuantity: 0 },
          { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Rosa', quantity: 1, soldQuantity: 1 },
          { id: 'v3', size: { label: 'P', value: 'P' }, color: 'Verde', quantity: 3, soldQuantity: 0 }
        ]
      },
      // 5. Blazer Executivo - 2 variações
      {
        id: 'demo-CL-5',
        code: 'BLA-005',
        name: 'Blazer Executivo',
        description: 'Blazer elegante para ocasiões profissionais',
        category: 'Blazers',
        brand: 'Kaylla Fashion',
        supplier: 'Corporate Style Ltda',
        costPrice: 85.00,
        freightPerUnit: 8.50,
        packagingCost: 4.00,
        baseCost: 97.50,
        creditFeePercent: 3.5,
        creditFeeAmount: 3.41,
        salePrice: 159.90,
        sellingPrice: 159.90,
        profit: 59.00,
        status: 'available',
        createdAt: new Date('2024-12-05'),
        updatedAt: new Date('2025-01-14'),
        variations: [
          { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Preto', quantity: 0, soldQuantity: 1 },
          { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Cinza', quantity: 1, soldQuantity: 0 }
        ]
      },
      // 6. Shorts Jeans - 3 variações
      {
        id: 'demo-CL-6',
        code: 'SHO-006',
        name: 'Shorts Jeans',
        description: 'Shorts jeans com corte moderno',
        category: 'Shorts',
        brand: 'Kaylla Fashion',
        supplier: 'Moda & Estilo Ltda',
        costPrice: 32.00,
        freightPerUnit: 3.20,
        packagingCost: 1.30,
        baseCost: 36.50,
        creditFeePercent: 3.5,
        creditFeeAmount: 1.28,
        salePrice: 69.90,
        sellingPrice: 69.90,
        profit: 32.12,
        status: 'available',
        createdAt: new Date('2024-12-06'),
        updatedAt: new Date('2025-01-15'),
        variations: [
          { id: 'v1', size: { label: '38', value: '38' }, color: 'Azul', quantity: 2, soldQuantity: 1 },
          { id: 'v2', size: { label: '40', value: '40' }, color: 'Preto', quantity: 1, soldQuantity: 0 },
          { id: 'v3', size: { label: '42', value: '42' }, color: 'Azul', quantity: 3, soldQuantity: 0 }
        ]
      },
      // 7. Camiseta Polo - 2 variações
      {
        id: 'demo-CL-7',
        code: 'POL-007',
        name: 'Camiseta Polo',
        description: 'Camiseta polo com gola e botões',
        category: 'Camisetas',
        brand: 'Kaylla Fashion',
        supplier: 'Moda & Estilo Ltda',
        costPrice: 38.00,
        freightPerUnit: 3.80,
        packagingCost: 1.60,
        baseCost: 43.40,
        creditFeePercent: 3.5,
        creditFeeAmount: 1.52,
        salePrice: 79.90,
        sellingPrice: 79.90,
        profit: 34.98,
        status: 'available',
        createdAt: new Date('2024-12-07'),
        updatedAt: new Date('2025-01-16'),
        variations: [
          { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Branco', quantity: 1, soldQuantity: 2 },
          { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Azul', quantity: 2, soldQuantity: 0 }
        ]
      },
      // 8. Vestido de Festa - 2 variações
      {
        id: 'demo-CL-8',
        code: 'VES-008',
        name: 'Vestido de Festa',
        description: 'Vestido elegante para festas e eventos',
        category: 'Vestidos',
        brand: 'Kaylla Fashion',
        supplier: 'Party Wear Solutions',
        costPrice: 75.00,
        freightPerUnit: 7.50,
        packagingCost: 3.50,
        baseCost: 86.00,
        creditFeePercent: 3.5,
        creditFeeAmount: 3.01,
        salePrice: 149.90,
        sellingPrice: 149.90,
        profit: 60.89,
        status: 'available',
        createdAt: new Date('2024-12-08'),
        updatedAt: new Date('2025-01-17'),
        variations: [
          { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Preto', quantity: 0, soldQuantity: 1 },
          { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Dourado', quantity: 1, soldQuantity: 0 }
        ]
      },
      // 9. Calça Social - 3 variações
      {
        id: 'demo-CL-9',
        code: 'CAL-009',
        name: 'Calça Social',
        description: 'Calça social com corte clássico',
        category: 'Calças',
        brand: 'Kaylla Fashion',
        supplier: 'Moda & Estilo Ltda',
        costPrice: 55.00,
        freightPerUnit: 5.50,
        packagingCost: 2.50,
        baseCost: 63.00,
        creditFeePercent: 3.5,
        creditFeeAmount: 2.21,
        salePrice: 99.90,
        sellingPrice: 99.90,
        profit: 34.69,
        status: 'available',
        createdAt: new Date('2024-12-09'),
        updatedAt: new Date('2025-01-18'),
        variations: [
          { id: 'v1', size: { label: '38', value: '38' }, color: 'Preto', quantity: 2, soldQuantity: 0 },
          { id: 'v2', size: { label: '40', value: '40' }, color: 'Cinza', quantity: 1, soldQuantity: 1 },
          { id: 'v3', size: { label: '42', value: '42' }, color: 'Azul', quantity: 3, soldQuantity: 0 }
        ]
      },
      // 10. Top Básico - 2 variações
      {
        id: 'demo-CL-10',
        code: 'TOP-010',
        name: 'Top Básico',
        description: 'Top básico de algodão',
        category: 'Tops',
        brand: 'Kaylla Fashion',
        supplier: 'Moda & Estilo Ltda',
        costPrice: 22.00,
        freightPerUnit: 2.20,
        packagingCost: 0.80,
        baseCost: 25.00,
        creditFeePercent: 3.5,
        creditFeeAmount: 0.88,
        salePrice: 49.90,
        sellingPrice: 49.90,
        profit: 24.02,
        status: 'available',
        createdAt: new Date('2024-12-10'),
        updatedAt: new Date('2025-01-19'),
        variations: [
          { id: 'v1', size: { label: 'P', value: 'P' }, color: 'Branco', quantity: 4, soldQuantity: 1 },
          { id: 'v2', size: { label: 'M', value: 'M' }, color: 'Rosa', quantity: 2, soldQuantity: 0 }
        ]
      },
      // 11. Macacão Jeans - 2 variações
      {
        id: 'demo-CL-11',
        code: 'MAC-011',
        name: 'Macacão Jeans',
        description: 'Macacão jeans com alças ajustáveis',
        category: 'Macacões',
        brand: 'Kaylla Fashion',
        supplier: 'Denim Works Indústria',
        costPrice: 68.00,
        freightPerUnit: 6.80,
        packagingCost: 3.20,
        baseCost: 78.00,
        creditFeePercent: 3.5,
        creditFeeAmount: 2.73,
        salePrice: 139.90,
        sellingPrice: 139.90,
        profit: 59.17,
        status: 'available',
        createdAt: new Date('2024-12-11'),
        updatedAt: new Date('2025-01-20'),
        variations: [
          { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Azul', quantity: 1, soldQuantity: 1 },
          { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Preto', quantity: 2, soldQuantity: 0 }
        ]
      },
      // 12. Cardigã - 3 variações
      {
        id: 'demo-CL-12',
        code: 'CAR-012',
        name: 'Cardigã',
        description: 'Cardigã de tricô com botões',
        category: 'Cardigãs',
        brand: 'Kaylla Fashion',
        supplier: 'Moda & Estilo Ltda',
        costPrice: 42.00,
        freightPerUnit: 4.20,
        packagingCost: 1.80,
        baseCost: 48.00,
        creditFeePercent: 3.5,
        creditFeeAmount: 1.68,
        salePrice: 89.90,
        sellingPrice: 89.90,
        profit: 40.22,
        status: 'available',
        createdAt: new Date('2024-12-12'),
        updatedAt: new Date('2025-01-21'),
        variations: [
          { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Bege', quantity: 2, soldQuantity: 0 },
          { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Cinza', quantity: 1, soldQuantity: 1 },
          { id: 'v3', size: { label: 'P', value: 'P' }, color: 'Rosa', quantity: 3, soldQuantity: 0 }
        ]
      },
      // 13. Saia Longa - 2 variações
      {
        id: 'demo-CL-13',
        code: 'SAI-013',
        name: 'Saia Longa',
        description: 'Saia longa com estampa étnica',
        category: 'Saias',
        brand: 'Kaylla Fashion',
        supplier: 'Moda & Estilo Ltda',
        costPrice: 48.00,
        freightPerUnit: 4.80,
        packagingCost: 2.20,
        baseCost: 55.00,
        creditFeePercent: 3.5,
        creditFeeAmount: 1.93,
        salePrice: 99.90,
        sellingPrice: 99.90,
        profit: 42.97,
        status: 'available',
        createdAt: new Date('2024-12-13'),
        updatedAt: new Date('2025-01-22'),
        variations: [
          { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Multicolor', quantity: 1, soldQuantity: 1 },
          { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Azul', quantity: 2, soldQuantity: 0 }
        ]
      },
      // 14. Jaqueta Jeans - 2 variações
      {
        id: 'demo-CL-14',
        code: 'JAQ-014',
        name: 'Jaqueta Jeans',
        description: 'Jaqueta jeans clássica',
        category: 'Jaquetas',
        brand: 'Kaylla Fashion',
        supplier: 'Moda & Estilo Ltda',
        costPrice: 58.00,
        freightPerUnit: 5.80,
        packagingCost: 2.60,
        baseCost: 66.40,
        creditFeePercent: 3.5,
        creditFeeAmount: 2.32,
        salePrice: 119.90,
        sellingPrice: 119.90,
        profit: 51.18,
        status: 'available',
        createdAt: new Date('2024-12-14'),
        updatedAt: new Date('2025-01-23'),
        variations: [
          { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Azul', quantity: 0, soldQuantity: 1 },
          { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Preto', quantity: 1, soldQuantity: 0 }
        ]
      },
      // 15. Body Básico - 3 variações
      {
        id: 'demo-CL-15',
        code: 'BOD-015',
        name: 'Body Básico',
        description: 'Body básico de algodão',
        category: 'Bodies',
        brand: 'Kaylla Fashion',
        supplier: 'Intimate Wear Corp',
        costPrice: 28.00,
        freightPerUnit: 2.80,
        packagingCost: 1.20,
        baseCost: 32.00,
        creditFeePercent: 3.5,
        creditFeeAmount: 1.12,
        salePrice: 59.90,
        sellingPrice: 59.90,
        profit: 26.78,
        status: 'available',
        createdAt: new Date('2024-12-15'),
        updatedAt: new Date('2025-01-24'),
        variations: [
          { id: 'v1', size: { label: 'P', value: 'P' }, color: 'Branco', quantity: 3, soldQuantity: 0 },
          { id: 'v2', size: { label: 'M', value: 'M' }, color: 'Preto', quantity: 2, soldQuantity: 1 },
          { id: 'v3', size: { label: 'G', value: 'G' }, color: 'Azul', quantity: 1, soldQuantity: 0 }
        ]
      },
      // 16. Vestido Midi - 2 variações
      {
        id: 'demo-CL-16',
        code: 'VES-016',
        name: 'Vestido Midi',
        description: 'Vestido midi com estampa floral',
        category: 'Vestidos',
        brand: 'Kaylla Fashion',
        supplier: 'Moda & Estilo Ltda',
        costPrice: 52.00,
        freightPerUnit: 5.20,
        packagingCost: 2.30,
        baseCost: 59.50,
        creditFeePercent: 3.5,
        creditFeeAmount: 2.08,
        salePrice: 109.90,
        sellingPrice: 109.90,
        profit: 48.32,
        status: 'available',
        createdAt: new Date('2024-12-16'),
        updatedAt: new Date('2025-01-25'),
        variations: [
          { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Floral', quantity: 1, soldQuantity: 1 },
          { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Rosa', quantity: 2, soldQuantity: 0 }
        ]
      },
      // 17. Calça Legging - 2 variações
      {
        id: 'demo-CL-17',
        code: 'CAL-017',
        name: 'Calça Legging',
        description: 'Calça legging com elastano',
        category: 'Calças',
        brand: 'Kaylla Fashion',
        supplier: 'Moda & Estilo Ltda',
        costPrice: 32.00,
        freightPerUnit: 3.20,
        packagingCost: 1.30,
        baseCost: 36.50,
        creditFeePercent: 3.5,
        creditFeeAmount: 1.28,
        salePrice: 69.90,
        sellingPrice: 69.90,
        profit: 32.12,
        status: 'available',
        createdAt: new Date('2024-12-17'),
        updatedAt: new Date('2025-01-26'),
        variations: [
          { id: 'v1', size: { label: 'P', value: 'P' }, color: 'Preto', quantity: 4, soldQuantity: 1 },
          { id: 'v2', size: { label: 'M', value: 'M' }, color: 'Azul', quantity: 2, soldQuantity: 0 }
        ]
      },
      // 18. Blusa de Seda - 2 variações
      {
        id: 'demo-CL-18',
        code: 'BLU-018',
        name: 'Blusa de Seda',
        description: 'Blusa de seda com corte elegante',
        category: 'Blusas',
        brand: 'Kaylla Fashion',
        supplier: 'Silk & Luxury Fashion',
        costPrice: 65.00,
        freightPerUnit: 6.50,
        packagingCost: 3.00,
        baseCost: 74.50,
        creditFeePercent: 3.5,
        creditFeeAmount: 2.61,
        salePrice: 129.90,
        sellingPrice: 129.90,
        profit: 52.79,
        status: 'available',
        createdAt: new Date('2024-12-18'),
        updatedAt: new Date('2025-01-27'),
        variations: [
          { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Branco', quantity: 1, soldQuantity: 1 },
          { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Bege', quantity: 0, soldQuantity: 1 }
        ]
      },
      // 19. Saia Plissada - 2 variações
      {
        id: 'demo-CL-19',
        code: 'SAI-019',
        name: 'Saia Plissada',
        description: 'Saia plissada com pregas',
        category: 'Saias',
        brand: 'Kaylla Fashion',
        supplier: 'Moda & Estilo Ltda',
        costPrice: 38.00,
        freightPerUnit: 3.80,
        packagingCost: 1.60,
        baseCost: 43.40,
        creditFeePercent: 3.5,
        creditFeeAmount: 1.52,
        salePrice: 79.90,
        sellingPrice: 79.90,
        profit: 34.98,
        status: 'available',
        createdAt: new Date('2024-12-19'),
        updatedAt: new Date('2025-01-28'),
        variations: [
          { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Preto', quantity: 2, soldQuantity: 0 },
          { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Azul', quantity: 1, soldQuantity: 1 }
        ]
      },
      // 20. Vestido Tubinho - 2 variações
      {
        id: 'demo-CL-20',
        code: 'VES-020',
        name: 'Vestido Tubinho',
        description: 'Vestido tubinho com corte clássico',
        category: 'Vestidos',
        brand: 'Kaylla Fashion',
        supplier: 'Moda & Estilo Ltda',
        costPrice: 45.00,
        freightPerUnit: 4.50,
        packagingCost: 2.00,
        baseCost: 51.50,
        creditFeePercent: 3.5,
        creditFeeAmount: 1.80,
        salePrice: 89.90,
        sellingPrice: 89.90,
        profit: 36.60,
        status: 'available',
        createdAt: new Date('2024-12-20'),
        updatedAt: new Date('2025-01-29'),
        variations: [
          { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Preto', quantity: 1, soldQuantity: 1 },
          { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Vermelho', quantity: 2, soldQuantity: 0 }
        ]
      }
    ];
  }

  if (collectionName === 'sales') {
    return [
      // Venda 1 - Maria Silva (Paga)
      {
        id: 'demo-SALE-1',
        customerName: 'Maria Silva',
        customerPhone: '(11) 99999-1111',
        items: [
          {
            clothingItemId: 'demo-CL-1',
            clothingItemCode: 'BLU-001',
            clothingItemName: 'Blusa Básica',
            variationId: 'v1',
            size: 'M',
            color: 'Branco',
            quantity: 1,
            unitPrice: 59.90,
            totalPrice: 59.90
          },
          {
            clothingItemId: 'demo-CL-4',
            clothingItemCode: 'SAI-004',
            clothingItemName: 'Saia Midi Floral',
            variationId: 'v2',
            size: 'G',
            color: 'Rosa',
            quantity: 1,
            unitPrice: 79.90,
            totalPrice: 79.90
          }
        ],
        discount: 0,
        discountType: 'percentual',
        total: 139.80,
        paymentMethod: 'dinheiro',
        status: 'pago',
        notes: 'Cliente satisfeita com a qualidade',
        createdAt: new Date('2025-01-15'),
        updatedAt: new Date('2025-01-15')
      },
      // Venda 2 - João Santos (Paga com desconto)
      {
        id: 'demo-SALE-2',
        customerName: 'João Santos',
        customerPhone: '(11) 99999-2222',
        items: [
          {
            clothingItemId: 'demo-CL-2',
            clothingItemCode: 'CAL-002',
            clothingItemName: 'Calça Jeans Skinny',
            variationId: 'v2',
            size: '40',
            color: 'Azul',
            quantity: 2,
            unitPrice: 89.90,
            totalPrice: 179.80
          },
          {
            clothingItemId: 'demo-CL-7',
            clothingItemCode: 'POL-007',
            clothingItemName: 'Camiseta Polo',
            variationId: 'v1',
            size: 'M',
            color: 'Branco',
            quantity: 2,
            unitPrice: 79.90,
            totalPrice: 159.80
          }
        ],
        discount: 10,
        discountType: 'percentual',
        total: 305.64,
        paymentMethod: 'cartao',
        status: 'pago',
        notes: 'Compra para presente',
        createdAt: new Date('2025-01-18'),
        updatedAt: new Date('2025-01-18')
      },
      // Venda 3 - Ana Costa (Pendente)
      {
        id: 'demo-SALE-3',
        customerName: 'Ana Costa',
        customerPhone: '(11) 99999-3333',
        items: [
          {
            clothingItemId: 'demo-CL-3',
            clothingItemCode: 'VES-003',
            clothingItemName: 'Vestido Elegante',
            variationId: 'v1',
            size: 'M',
            color: 'Preto',
            quantity: 1,
            unitPrice: 129.90,
            totalPrice: 129.90
          }
        ],
        discount: 0,
        discountType: 'percentual',
        total: 129.90,
        paymentMethod: 'pix',
        status: 'pendente',
        notes: 'Aguardando pagamento',
        createdAt: new Date('2025-01-20'),
        updatedAt: new Date('2025-01-20')
      },
      // Venda 4 - Carlos Oliveira (Paga)
      {
        id: 'demo-SALE-4',
        customerName: 'Carlos Oliveira',
        customerPhone: '(11) 99999-4444',
        items: [
          {
            clothingItemId: 'demo-CL-5',
            clothingItemCode: 'BLA-005',
            clothingItemName: 'Blazer Executivo',
            variationId: 'v1',
            size: 'M',
            color: 'Preto',
            quantity: 1,
            unitPrice: 159.90,
            totalPrice: 159.90
          },
          {
            clothingItemId: 'demo-CL-9',
            clothingItemCode: 'CAL-009',
            clothingItemName: 'Calça Social',
            variationId: 'v2',
            size: '40',
            color: 'Cinza',
            quantity: 1,
            unitPrice: 99.90,
            totalPrice: 99.90
          }
        ],
        discount: 5,
        discountType: 'percentual',
        total: 246.86,
        paymentMethod: 'cartao',
        status: 'pago',
        notes: 'Cliente corporativo',
        createdAt: new Date('2025-01-22'),
        updatedAt: new Date('2025-01-22')
      },
      // Venda 5 - Fernanda Lima (Paga)
      {
        id: 'demo-SALE-5',
        customerName: 'Fernanda Lima',
        customerPhone: '(11) 99999-5555',
        items: [
          {
            clothingItemId: 'demo-CL-8',
            clothingItemCode: 'VES-008',
            clothingItemName: 'Vestido de Festa',
            variationId: 'v1',
            size: 'M',
            color: 'Preto',
            quantity: 1,
            unitPrice: 149.90,
            totalPrice: 149.90
          },
          {
            clothingItemId: 'demo-CL-18',
            clothingItemCode: 'BLU-018',
            clothingItemName: 'Blusa de Seda',
            variationId: 'v2',
            size: 'G',
            color: 'Bege',
            quantity: 1,
            unitPrice: 129.90,
            totalPrice: 129.90
          }
        ],
        discount: 0,
        discountType: 'percentual',
        total: 279.80,
        paymentMethod: 'pix',
        status: 'pago',
        notes: 'Compra para evento especial',
        createdAt: new Date('2025-01-25'),
        updatedAt: new Date('2025-01-25')
      },
      // Venda 6 - Roberto Alves (Pendente)
      {
        id: 'demo-SALE-6',
        customerName: 'Roberto Alves',
        customerPhone: '(11) 99999-6666',
        items: [
          {
            clothingItemId: 'demo-CL-14',
            clothingItemCode: 'JAQ-014',
            clothingItemName: 'Jaqueta Jeans',
            variationId: 'v1',
            size: 'M',
            color: 'Azul',
            quantity: 1,
            unitPrice: 119.90,
            totalPrice: 119.90
          }
        ],
        discount: 0,
        discountType: 'percentual',
        total: 119.90,
        paymentMethod: 'dinheiro',
        status: 'pendente',
        notes: 'Cliente vai buscar amanhã',
        createdAt: new Date('2025-01-28'),
        updatedAt: new Date('2025-01-28')
      },
      // Venda 7 - Juliana Santos (Paga)
      {
        id: 'demo-SALE-7',
        customerName: 'Juliana Santos',
        customerPhone: '(11) 99999-7777',
        items: [
          {
            clothingItemId: 'demo-CL-10',
            clothingItemCode: 'TOP-010',
            clothingItemName: 'Top Básico',
            variationId: 'v1',
            size: 'P',
            color: 'Branco',
            quantity: 1,
            unitPrice: 49.90,
            totalPrice: 49.90
          },
          {
            clothingItemId: 'demo-CL-17',
            clothingItemCode: 'CAL-017',
            clothingItemName: 'Calça Legging',
            variationId: 'v1',
            size: 'P',
            color: 'Preto',
            quantity: 1,
            unitPrice: 69.90,
            totalPrice: 69.90
          },
          {
            clothingItemId: 'demo-CL-19',
            clothingItemCode: 'SAI-019',
            clothingItemName: 'Saia Plissada',
            variationId: 'v2',
            size: 'G',
            color: 'Azul',
            quantity: 1,
            unitPrice: 79.90,
            totalPrice: 79.90
          }
        ],
        discount: 15,
        discountType: 'percentual',
        total: 169.35,
        paymentMethod: 'cartao',
        status: 'pago',
        notes: 'Compra em lote com desconto',
        createdAt: new Date('2025-01-30'),
        updatedAt: new Date('2025-01-30')
      },
      // Venda 8 - Marcos Pereira (Paga)
      {
        id: 'demo-SALE-8',
        customerName: 'Marcos Pereira',
        customerPhone: '(11) 99999-8888',
        items: [
          {
            clothingItemId: 'demo-CL-6',
            clothingItemCode: 'SHO-006',
            clothingItemName: 'Shorts Jeans',
            variationId: 'v1',
            size: '38',
            color: 'Azul',
            quantity: 1,
            unitPrice: 69.90,
            totalPrice: 69.90
          },
          {
            clothingItemId: 'demo-CL-12',
            clothingItemCode: 'CAR-012',
            clothingItemName: 'Cardigã',
            variationId: 'v2',
            size: 'G',
            color: 'Cinza',
            quantity: 1,
            unitPrice: 89.90,
            totalPrice: 89.90
          }
        ],
        discount: 0,
        discountType: 'percentual',
        total: 159.80,
        paymentMethod: 'dinheiro',
        status: 'pago',
        notes: 'Cliente frequente',
        createdAt: new Date('2025-02-01'),
        updatedAt: new Date('2025-02-01')
      },
      // Venda 9 - Patricia Costa (Pendente)
      {
        id: 'demo-SALE-9',
        customerName: 'Patricia Costa',
        customerPhone: '(11) 99999-9999',
        items: [
          {
            clothingItemId: 'demo-CL-16',
            clothingItemCode: 'VES-016',
            clothingItemName: 'Vestido Midi',
            variationId: 'v1',
            size: 'M',
            color: 'Floral',
            quantity: 1,
            unitPrice: 109.90,
            totalPrice: 109.90
          }
        ],
        discount: 0,
        discountType: 'percentual',
        total: 109.90,
        paymentMethod: 'pix',
        status: 'pendente',
        notes: 'Aguardando confirmação de pagamento',
        createdAt: new Date('2025-02-03'),
        updatedAt: new Date('2025-02-03')
      },
      // Venda 10 - Ricardo Silva (Paga)
      {
        id: 'demo-SALE-10',
        customerName: 'Ricardo Silva',
        customerPhone: '(11) 99999-0000',
        items: [
          {
            clothingItemId: 'demo-CL-11',
            clothingItemCode: 'MAC-011',
            clothingItemName: 'Macacão Jeans',
            variationId: 'v1',
            size: 'M',
            color: 'Azul',
            quantity: 1,
            unitPrice: 139.90,
            totalPrice: 139.90
          },
          {
            clothingItemId: 'demo-CL-20',
            clothingItemCode: 'VES-020',
            clothingItemName: 'Vestido Tubinho',
            variationId: 'v1',
            size: 'M',
            color: 'Preto',
            quantity: 1,
            unitPrice: 89.90,
            totalPrice: 89.90
          }
        ],
        discount: 8,
        discountType: 'percentual',
        total: 211.30,
        paymentMethod: 'cartao',
        status: 'pago',
        notes: 'Compra para viagem',
        createdAt: new Date('2025-02-05'),
        updatedAt: new Date('2025-02-05')
      }
    ];
  }

  if (collectionName === 'fluxo') {
    return [
      // Saída - Embalagem
      {
        id: 'demo-FLUXO-1',
        tipo: 'saida',
        origem: 'embalagem',
        descricao: 'Sacos de papel - Janeiro 2025',
        valor: 30.00,
        data: new Date('2025-01-10'),
        createdAt: new Date('2025-01-10'),
        updatedAt: new Date('2025-01-10')
      },
      // Saída - Caixa da Loja
      {
        id: 'demo-FLUXO-2',
        tipo: 'saida',
        origem: 'caixa',
        suborigem: 'caixa_loja',
        descricao: 'Conta de energia - Janeiro 2025',
        valor: 120.00,
        data: new Date('2025-01-15'),
        createdAt: new Date('2025-01-15'),
        updatedAt: new Date('2025-01-15')
      },
      // Saída - Salário
      {
        id: 'demo-FLUXO-3',
        tipo: 'saida',
        origem: 'caixa',
        suborigem: 'salario',
        descricao: 'Salário - Janeiro 2025',
        valor: 300.00,
        data: new Date('2025-01-31'),
        createdAt: new Date('2025-01-31'),
        updatedAt: new Date('2025-01-31')
      },
      // Saída - Reinvestimento
      {
        id: 'demo-FLUXO-4',
        tipo: 'saida',
        origem: 'caixa',
        suborigem: 'reinvestimento',
        descricao: 'Lote Moda & Estilo - Fev 2025',
        valor: 500.00,
        data: new Date('2025-02-01'),
        createdAt: new Date('2025-02-01'),
        updatedAt: new Date('2025-02-01')
      }
    ];
  }

  if (collectionName === 'investments') {
    return [
      // Lote 1 - Moda & Estilo Ltda (Completo)
      {
        id: 'demo-INV-1',
        name: 'Lote Moda & Estilo - Jan 2025',
        supplier: 'Moda & Estilo Ltda',
        date: new Date('2025-01-05'),
        status: 'completed',
        items: [
          {
            id: 'demo-CL-1',
            code: 'BLU-001',
            name: 'Blusa Básica',
            costPrice: 28.00,
            freightCost: 14.00,
            freightQuantity: 5,
            extraCosts: 6.00,
            creditFeePercent: 3.5,
            variations: [
              { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Branco', quantity: 3 },
              { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Preto', quantity: 3 },
              { id: 'v3', size: { label: 'P', value: 'P' }, color: 'Azul', quantity: 3 }
            ]
          },
          {
            id: 'demo-CL-4',
            code: 'SAI-004',
            name: 'Saia Midi Floral',
            costPrice: 35.00,
            freightCost: 10.50,
            freightQuantity: 3,
            extraCosts: 4.50,
            creditFeePercent: 3.5,
            variations: [
              { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Branco', quantity: 2 },
              { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Rosa', quantity: 2 },
              { id: 'v3', size: { label: 'P', value: 'P' }, color: 'Verde', quantity: 3 }
            ]
          }
        ]
      },
      // Lote 2 - Jeans Brasil Confecções (Completo)
      {
        id: 'demo-INV-2',
        name: 'Lote Jeans Brasil - Jan 2025',
        supplier: 'Jeans Brasil Confecções',
        date: new Date('2025-01-08'),
        status: 'completed',
        items: [
          {
            id: 'demo-CL-2',
            code: 'CAL-002',
            name: 'Calça Jeans Skinny',
            costPrice: 45.00,
            freightCost: 18.00,
            freightQuantity: 4,
            extraCosts: 8.00,
            creditFeePercent: 3.5,
            variations: [
              { id: 'v1', size: { label: '38', value: '38' }, color: 'Azul', quantity: 2 },
              { id: 'v2', size: { label: '40', value: '40' }, color: 'Azul', quantity: 2 },
              { id: 'v3', size: { label: '42', value: '42' }, color: 'Preto', quantity: 2 },
              { id: 'v4', size: { label: '38', value: '38' }, color: 'Branco', quantity: 2 }
            ]
          },
          {
            id: 'demo-CL-6',
            code: 'SHO-006',
            name: 'Shorts Jeans',
            costPrice: 32.00,
            freightCost: 9.60,
            freightQuantity: 3,
            extraCosts: 3.90,
            creditFeePercent: 3.5,
            variations: [
              { id: 'v1', size: { label: '38', value: '38' }, color: 'Azul', quantity: 3 },
              { id: 'v2', size: { label: '40', value: '40' }, color: 'Preto', quantity: 1 },
              { id: 'v3', size: { label: '42', value: '42' }, color: 'Azul', quantity: 3 }
            ]
          }
        ]
      },
      // Lote 3 - Elegance Fashion Group (Completo)
      {
        id: 'demo-INV-3',
        name: 'Lote Elegance - Jan 2025',
        supplier: 'Elegance Fashion Group',
        date: new Date('2025-01-12'),
        status: 'completed',
        items: [
          {
            id: 'demo-CL-3',
            code: 'VES-003',
            name: 'Vestido Elegante',
            costPrice: 65.00,
            freightCost: 13.00,
            freightQuantity: 2,
            extraCosts: 6.00,
            creditFeePercent: 3.5,
            variations: [
              { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Preto', quantity: 1 },
              { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Vermelho', quantity: 2 }
            ]
          },
          {
            id: 'demo-CL-16',
            code: 'VES-016',
            name: 'Vestido Midi',
            costPrice: 52.00,
            freightCost: 10.40,
            freightQuantity: 2,
            extraCosts: 4.60,
            creditFeePercent: 3.5,
            variations: [
              { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Floral', quantity: 2 },
              { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Rosa', quantity: 2 }
            ]
          }
        ]
      },
      // Lote 4 - Corporate Style Ltda (Completo)
      {
        id: 'demo-INV-4',
        name: 'Lote Corporate - Jan 2025',
        supplier: 'Corporate Style Ltda',
        date: new Date('2025-01-15'),
        status: 'completed',
        items: [
          {
            id: 'demo-CL-5',
            code: 'BLA-005',
            name: 'Blazer Executivo',
            costPrice: 85.00,
            freightCost: 17.00,
            freightQuantity: 2,
            extraCosts: 8.00,
            creditFeePercent: 3.5,
            variations: [
              { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Preto', quantity: 1 },
              { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Cinza', quantity: 1 }
            ]
          },
          {
            id: 'demo-CL-9',
            code: 'CAL-009',
            name: 'Calça Social',
            costPrice: 55.00,
            freightCost: 11.00,
            freightQuantity: 2,
            extraCosts: 5.00,
            creditFeePercent: 3.5,
            variations: [
              { id: 'v1', size: { label: '38', value: '38' }, color: 'Preto', quantity: 2 },
              { id: 'v2', size: { label: '40', value: '40' }, color: 'Cinza', quantity: 1 },
              { id: 'v3', size: { label: '42', value: '42' }, color: 'Azul', quantity: 3 }
            ]
          }
        ]
      },
      // Lote 5 - Party Wear Solutions (Completo)
      {
        id: 'demo-INV-5',
        name: 'Lote Party Wear - Jan 2025',
        supplier: 'Party Wear Solutions',
        date: new Date('2025-01-18'),
        status: 'completed',
        items: [
          {
            id: 'demo-CL-8',
            code: 'VES-008',
            name: 'Vestido de Festa',
            costPrice: 75.00,
            freightCost: 15.00,
            freightQuantity: 2,
            extraCosts: 7.00,
            creditFeePercent: 3.5,
            variations: [
              { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Preto', quantity: 1 },
              { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Dourado', quantity: 1 }
            ]
          }
        ]
      },
      // Lote 6 - Denim Works Indústria (Completo)
      {
        id: 'demo-INV-6',
        name: 'Lote Denim Works - Jan 2025',
        supplier: 'Denim Works Indústria',
        date: new Date('2025-01-22'),
        status: 'completed',
        items: [
          {
            id: 'demo-CL-11',
            code: 'MAC-011',
            name: 'Macacão Jeans',
            costPrice: 68.00,
            freightCost: 13.60,
            freightQuantity: 2,
            extraCosts: 6.40,
            creditFeePercent: 3.5,
            variations: [
              { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Azul', quantity: 2 },
              { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Preto', quantity: 2 }
            ]
          },
          {
            id: 'demo-CL-14',
            code: 'JAQ-014',
            name: 'Jaqueta Jeans',
            costPrice: 58.00,
            freightCost: 11.60,
            freightQuantity: 2,
            extraCosts: 5.20,
            creditFeePercent: 3.5,
            variations: [
              { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Azul', quantity: 1 },
              { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Preto', quantity: 1 }
            ]
          }
        ]
      },
      // Lote 7 - Silk & Luxury Fashion (Completo)
      {
        id: 'demo-INV-7',
        name: 'Lote Silk & Luxury - Jan 2025',
        supplier: 'Silk & Luxury Fashion',
        date: new Date('2025-01-25'),
        status: 'completed',
        items: [
          {
            id: 'demo-CL-18',
            code: 'BLU-018',
            name: 'Blusa de Seda',
            costPrice: 65.00,
            freightCost: 13.00,
            freightQuantity: 2,
            extraCosts: 6.00,
            creditFeePercent: 3.5,
            variations: [
              { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Branco', quantity: 2 },
              { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Bege', quantity: 1 }
            ]
          }
        ]
      },
      // Lote 8 - Intimate Wear Corp (Completo)
      {
        id: 'demo-INV-8',
        name: 'Lote Intimate Wear - Jan 2025',
        supplier: 'Intimate Wear Corp',
        date: new Date('2025-01-28'),
        status: 'completed',
        items: [
          {
            id: 'demo-CL-15',
            code: 'BOD-015',
            name: 'Body Básico',
            costPrice: 28.00,
            freightCost: 8.40,
            freightQuantity: 3,
            extraCosts: 3.60,
            creditFeePercent: 3.5,
            variations: [
              { id: 'v1', size: { label: 'P', value: 'P' }, color: 'Branco', quantity: 3 },
              { id: 'v2', size: { label: 'M', value: 'M' }, color: 'Preto', quantity: 3 },
              { id: 'v3', size: { label: 'G', value: 'G' }, color: 'Azul', quantity: 1 }
            ]
          }
        ]
      },
      // Lote 9 - Moda & Estilo Ltda (Em Andamento)
      {
        id: 'demo-INV-9',
        name: 'Lote Moda & Estilo - Fev 2025',
        supplier: 'Moda & Estilo Ltda',
        date: new Date('2025-02-01'),
        status: 'in_progress',
        items: [
          {
            id: 'demo-CL-7',
            code: 'POL-007',
            name: 'Camiseta Polo',
            costPrice: 38.00,
            freightCost: 11.40,
            freightQuantity: 3,
            extraCosts: 4.80,
            creditFeePercent: 3.5,
            variations: [
              { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Branco', quantity: 3 },
              { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Azul', quantity: 2 }
            ]
          },
          {
            id: 'demo-CL-12',
            code: 'CAR-012',
            name: 'Cardigã',
            costPrice: 42.00,
            freightCost: 12.60,
            freightQuantity: 3,
            extraCosts: 5.40,
            creditFeePercent: 3.5,
            variations: [
              { id: 'v1', size: { label: 'M', value: 'M' }, color: 'Bege', quantity: 2 },
              { id: 'v2', size: { label: 'G', value: 'G' }, color: 'Cinza', quantity: 2 },
              { id: 'v3', size: { label: 'P', value: 'P' }, color: 'Rosa', quantity: 3 }
            ]
          }
        ]
      },
      // Lote 10 - Vazio (Para demonstração)
      {
        id: 'demo-INV-10',
        name: 'Lote Vazio - Fev 2025',
        supplier: 'Fornecedor Novo',
        date: new Date('2025-02-05'),
        status: 'empty',
        items: []
      }
    ];
  }

  if (collectionName === 'notes') {
    return [
      {
        id: 'demo-NOTE-1',
        title: 'Reunião com fornecedor',
        content: 'Reunião agendada com Moda & Estilo Ltda para discutir novos produtos da coleção verão 2025. Interesse em blusas de seda e vestidos elegantes.',
        priority: 'alta',
        category: 'fornecedores',
        createdAt: new Date('2025-01-15'),
        updatedAt: new Date('2025-01-15')
      },
      {
        id: 'demo-NOTE-2',
        title: 'Promoção Black Friday',
        content: 'Preparar promoção especial para Black Friday: 30% de desconto em calças jeans e 20% em vestidos. Atualizar preços e preparar material de marketing.',
        priority: 'média',
        category: 'marketing',
        createdAt: new Date('2025-01-20'),
        updatedAt: new Date('2025-01-20')
      },
      {
        id: 'demo-NOTE-3',
        title: 'Inventário mensal',
        content: 'Realizar inventário completo no final do mês. Verificar estoque de peças em falta e atualizar sistema. Focar em produtos com baixa rotatividade.',
        priority: 'alta',
        category: 'estoque',
        createdAt: new Date('2025-01-25'),
        updatedAt: new Date('2025-01-25')
      },
      {
        id: 'demo-NOTE-4',
        title: 'Cliente VIP - Maria Silva',
        content: 'Cliente frequente, sempre compra vestidos elegantes. Oferecer desconto especial de 15% na próxima compra. Telefone: (11) 99999-1111',
        priority: 'baixa',
        category: 'clientes',
        createdAt: new Date('2025-01-28'),
        updatedAt: new Date('2025-01-28')
      },
      {
        id: 'demo-NOTE-5',
        title: 'Manutenção do sistema',
        content: 'Atualizar sistema de vendas e fazer backup dos dados. Verificar integração com sistema de pagamento e testar funcionalidades.',
        priority: 'média',
        category: 'sistema',
        createdAt: new Date('2025-02-01'),
        updatedAt: new Date('2025-02-01')
      }
    ];
  }

  return [];
}

export function useFirestore<T>(collectionName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const role = getCurrentUserRole();
    
    // For viewer role, return demo data immediately
    if (role === 'viewer') {
      console.log(`useFirestore: Retornando hook para coleção: ${collectionName} - Dados: ${getDemoData(collectionName).length} documentos - Inicializado: true`);
      setData(getDemoData(collectionName) as T[]);
      setLoading(false);
      setInitialized(true);
      return;
    }

    console.log(`useFirestore: ${collectionName} - role: ${role}`);
    console.log(`useFirestore: Iniciando onSnapshot para coleção: ${collectionName}`);

    const collectionRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(
      collectionRef,
      (snapshot) => {
        console.log(`useFirestore: onSnapshot recebeu dados para: ${collectionName} - Tamanho: ${snapshot.docs.length}`);
        
        const processedData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...convertTimestamps(data)
          };
        });
        
        console.log(`useFirestore: Dados processados: ${processedData.length} documentos`);
        setData(processedData as T[]);
        setLoading(false);
        setError(null);
        setInitialized(true);
      },
      (error) => {
        console.error(`useFirestore: Erro ao escutar coleção ${collectionName}:`, error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => {
      console.log(`useFirestore: Cleanup onSnapshot para coleção: ${collectionName}`);
      unsubscribe();
    };
  }, [collectionName]);

  // Adicionar documento
  const add = async (item: Omit<T, 'id'>): Promise<string | null> => {
    const role = getCurrentUserRole();
    
    if (role === 'viewer') {
      console.warn('useFirestore.add: Operação bloqueada para viewer (somente visualização)');
      setError('🔒 Modo Demonstração: Esta é uma conta de visualização. Alterações não são permitidas. Para usar todas as funcionalidades, faça login com uma conta de administrador ou usuário.');
      return null;
    }
    
    if (!role) {
      console.error('❌ useFirestore.add: Usuário não logado ou role não detectado');
      setError('❌ Usuário não logado. Faça login para continuar.');
      return null;
    }
    
    try {
      console.log('useFirestore: add chamado para coleção:', collectionName);
      console.log('useFirestore: Dados para adicionar:', item);
      setError(null);
      
      const docRef = await addDoc(collection(db, collectionName), {
        ...item,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ useFirestore: Documento salvo com sucesso! ID:', docRef.id);
      return docRef.id;
    } catch (err) {
      console.error('❌ useFirestore: Erro ao adicionar documento:', err);
      setError(err instanceof Error ? err.message : 'Erro ao adicionar documento');
      return null;
    }
  };

  // Atualizar documento
  const update = async (id: string, updates: Partial<T>): Promise<boolean> => {
    const role = getCurrentUserRole();
    if (role === 'viewer') {
      console.warn('useFirestore.update: Operação bloqueada para viewer (somente visualização)');
      setError('🔒 Modo Demonstração: Esta é uma conta de visualização. Alterações não são permitidas. Para usar todas as funcionalidades, faça login com uma conta de administrador ou usuário.');
      return false;
    }
    
    try {
      console.log('useFirestore: update chamado para ID:', id, 'na coleção:', collectionName);
      setError(null);
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date()
      });
      console.log('✅ useFirestore: Documento atualizado com sucesso');
      return true;
    } catch (err) {
      console.error('❌ useFirestore: Erro ao atualizar documento:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar documento');
      return false;
    }
  };

  // Deletar documento
  const remove = async (id: string): Promise<boolean> => {
    const role = getCurrentUserRole();
    if (role === 'viewer') {
      console.warn('useFirestore.remove: Operação bloqueada para viewer (somente visualização)');
      setError('🔒 Modo Demonstração: Esta é uma conta de visualização. Alterações não são permitidas. Para usar todas as funcionalidades, faça login com uma conta de administrador ou usuário.');
      return false;
    }
    
    try {
      console.log('useFirestore: remove chamado para ID:', id, 'na coleção:', collectionName);
      setError(null);
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      console.log('✅ useFirestore: Documento removido com sucesso');
      return true;
    } catch (err) {
      console.error('❌ useFirestore: Erro ao remover documento:', err);
      setError(err instanceof Error ? err.message : 'Erro ao remover documento');
      return false;
    }
  };

  return { data, loading, error, initialized, add, update, remove };
}

// Helper function to convert Firestore Timestamps to Date objects
function convertTimestamps(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof Timestamp) {
    console.log('useFirestore: Convertendo Timestamp para Date');
    return obj.toDate();
  }
  
  if (Array.isArray(obj)) {
    console.log(`useFirestore: Convertendo array com ${obj.length} itens`);
    return obj.map(convertTimestamps);
  }
  
  if (typeof obj === 'object') {
    console.log(`useFirestore: Convertendo objeto com ${Object.keys(obj).length} propriedades`);
    const converted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        converted[key] = convertTimestamps(obj[key]);
      }
    }
    return converted;
  }
  
  return obj;
}

// Helper function to check if current user is viewer
export function isViewer(): boolean {
  return getCurrentUserRole() === 'viewer';
}

// Helper function to get current user role
export function getCurrentRole(): 'admin' | 'user' | 'viewer' | null {
  return getCurrentUserRole();
}

// Funções para gerenciar usuários no Firebase
export const useUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Converter Timestamp do Firebase para Date
  const convertTimestamps = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (obj instanceof Timestamp) {
      return obj.toDate();
    }
    if (Array.isArray(obj)) {
      return obj.map(convertTimestamps);
    }
    if (typeof obj === 'object') {
      const converted: any = {};
      for (const key in obj) {
        converted[key] = convertTimestamps(obj[key]);
      }
      return converted;
    }
    return obj;
  };

  // Carregar usuários do Firebase
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      }));
      setUsers(usersData);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar usuário no Firebase
  const updateUser = async (userId: string, updates: any) => {
    try {
      setError(null);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date()
      });
      
      // Atualizar lista local
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ...updates, updatedAt: new Date() } : user
      ));
      
      return true;
    } catch (err) {
      console.error('Erro ao atualizar usuário:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar usuário');
      return false;
    }
  };

  // Criar usuário no Firebase
  const createUser = async (userData: any) => {
    try {
      console.log('🆕 createUser: Iniciando criação de usuário no Firebase');
      console.log('🆕 createUser: Dados do usuário:', userData);
      setError(null);
      
      // Verificar se o usuário já existe antes de criar
      const existingUser = await getUserByEmail(userData.email);
      if (existingUser) {
        console.log('⚠️ createUser: Usuário já existe, retornando ID existente:', existingUser.id);
        return existingUser.id;
      }
      
      const docRef = await addDoc(collection(db, 'users'), {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ createUser: Usuário criado com sucesso, ID:', docRef.id);
      return docRef.id;
    } catch (err) {
      console.error('❌ createUser: Erro ao criar usuário:', err);
      console.error('❌ createUser: Detalhes do erro:', {
        message: err instanceof Error ? err.message : 'Erro desconhecido',
        stack: err instanceof Error ? err.stack : 'N/A',
        userData: userData
      });
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário');
      return null;
    }
  };

  // Buscar usuário por email
  const getUserByEmail = async (email: string) => {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...convertTimestamps(doc.data())
        };
      }
      return null;
    } catch (err) {
      console.error('Erro ao buscar usuário:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar usuário');
      return null;
    }
  };

  return {
    users,
    loading,
    error,
    loadUsers,
    updateUser,
    createUser,
    getUserByEmail
  };
};
