'use client';

import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pencil, Trash2, Plus, ArrowUpDown } from 'lucide-react';

interface Drink {
  id: number;
  brand: string;
  flavor: string;
  size_ml: number;
  caffeine_mg: number | null;
  barcode: string | null;
}

export default function AllDrinksPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [filteredDrinks, setFilteredDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState('');
  const [sortBy, setSortBy] = useState<keyof Drink>('brand');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Edit/Add Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const [formData, setFormData] = useState({
    brand: '',
    flavor: '',
    size_ml: '',
    caffeine_mg: '',
    barcode: '',
  });

  useEffect(() => {
    fetchDrinks();
  }, []);

  useEffect(() => {
    filterAndSortDrinks();
  }, [drinks, brandFilter, sortBy, sortOrder]);

  const fetchDrinks = async () => {
    try {
      const response = await fetch('/api/drinks/manage');
      const data = await response.json();
      if (data.success) {
        setDrinks(data.data.drinks);
      }
    } catch (error) {
      console.error('Error fetching drinks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortDrinks = () => {
    let filtered = [...drinks];

    // Apply brand filter
    if (brandFilter) {
      filtered = filtered.filter((drink) =>
        drink.brand.toLowerCase().includes(brandFilter.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    setFilteredDrinks(filtered);
  };

  const toggleSort = (column: keyof Drink) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleAdd = () => {
    setEditingDrink(null);
    setFormData({
      brand: '',
      flavor: '',
      size_ml: '',
      caffeine_mg: '',
      barcode: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (drink: Drink) => {
    setEditingDrink(drink);
    setFormData({
      brand: drink.brand,
      flavor: drink.flavor,
      size_ml: drink.size_ml.toString(),
      caffeine_mg: drink.caffeine_mg?.toString() || '',
      barcode: drink.barcode || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this drink?')) return;

    try {
      const response = await fetch(`/api/drinks/manage?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchDrinks();
      }
    } catch (error) {
      console.error('Error deleting drink:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      id: editingDrink?.id,
    };

    try {
      const response = await fetch('/api/drinks/manage', {
        method: editingDrink ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setDialogOpen(false);
        fetchDrinks();
      }
    } catch (error) {
      console.error('Error saving drink:', error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">All Drinks Database</h1>
          <p className="text-zinc-400">Manage your energy drink inventory</p>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-6">
          <Input
            placeholder="Filter by brand..."
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="max-w-xs bg-zinc-900 border-purple-500/30 text-white"
          />
          <Button onClick={handleAdd} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Drink
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-4 text-zinc-400 text-sm">
          Showing {filteredDrinks.length} of {drinks.length} drinks
        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-purple-500/20 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-purple-500/20 hover:bg-purple-500/5">
                <TableHead className="text-purple-400">
                  <button
                    onClick={() => toggleSort('brand')}
                    className="flex items-center gap-2 hover:text-purple-300"
                  >
                    Brand
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>
                <TableHead className="text-purple-400">
                  <button
                    onClick={() => toggleSort('flavor')}
                    className="flex items-center gap-2 hover:text-purple-300"
                  >
                    Flavor
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>
                <TableHead className="text-purple-400">
                  <button
                    onClick={() => toggleSort('size_ml')}
                    className="flex items-center gap-2 hover:text-purple-300"
                  >
                    Size (ml)
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>
                <TableHead className="text-purple-400">
                  <button
                    onClick={() => toggleSort('caffeine_mg')}
                    className="flex items-center gap-2 hover:text-purple-300"
                  >
                    Caffeine (mg)
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>
                <TableHead className="text-purple-400">Barcode</TableHead>
                <TableHead className="text-purple-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-zinc-400">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredDrinks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-zinc-400">
                    No drinks found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDrinks.map((drink) => (
                  <TableRow key={drink.id} className="border-purple-500/10 hover:bg-purple-500/5">
                    <TableCell className="font-medium text-white">{drink.brand}</TableCell>
                    <TableCell className="text-zinc-300">{drink.flavor}</TableCell>
                    <TableCell className="text-zinc-300">{drink.size_ml}</TableCell>
                    <TableCell className="text-zinc-300">{drink.caffeine_mg || '-'}</TableCell>
                    <TableCell className="text-zinc-400 text-sm font-mono">
                      {drink.barcode || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={() => handleEdit(drink)}
                          size="sm"
                          variant="ghost"
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(drink.id)}
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-zinc-900 border-purple-500/30 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingDrink ? 'Edit Drink' : 'Add New Drink'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Brand</label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  required
                  className="bg-zinc-800 border-purple-500/30 text-white"
                  placeholder="e.g., Monster, Red Bull"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Flavor</label>
                <Input
                  value={formData.flavor}
                  onChange={(e) => setFormData({ ...formData, flavor: e.target.value })}
                  required
                  className="bg-zinc-800 border-purple-500/30 text-white"
                  placeholder="e.g., Ultra White, Original"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Size (ml)</label>
                <Input
                  type="number"
                  value={formData.size_ml}
                  onChange={(e) => setFormData({ ...formData, size_ml: e.target.value })}
                  required
                  className="bg-zinc-800 border-purple-500/30 text-white"
                  placeholder="e.g., 473, 355"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Caffeine (mg)</label>
                <Input
                  type="number"
                  value={formData.caffeine_mg}
                  onChange={(e) => setFormData({ ...formData, caffeine_mg: e.target.value })}
                  className="bg-zinc-800 border-purple-500/30 text-white"
                  placeholder="e.g., 200, 160"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Barcode/UPC</label>
                <Input
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="bg-zinc-800 border-purple-500/30 text-white"
                  placeholder="e.g., 0070847811503"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                  className="text-zinc-400"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  {editingDrink ? 'Save Changes' : 'Add Drink'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
