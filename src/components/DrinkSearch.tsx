'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface Drink {
  id: number;
  brand: string;
  flavor: string;
  size_ml: number;
  caffeine_mg: number | null;
  image_url: string | null;
}

export default function DrinkSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);

  useEffect(() => {
    const fetchDrinks = async () => {
      if (query.length < 1) {
        setDrinks([]);
        setOpen(false);
        return;
      }

      setLoading(true);
      setOpen(true);

      try {
        const response = await fetch(`/api/drinks/autocomplete?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setDrinks(data.drinks || []);
      } catch (error) {
        console.error('Error fetching drinks:', error);
        setDrinks([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchDrinks, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSelect = (drink: Drink) => {
    setSelectedDrink(drink);
    setQuery(`${drink.brand} ${drink.flavor}`);
    setOpen(false);
  };

  return (
    <div className="relative w-full max-w-2xl">
      <Command className="rounded-lg border border-purple-500/30 bg-black/40 backdrop-blur-sm shadow-2xl shadow-purple-500/20">
        <div className="flex items-center border-b border-purple-500/20 px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-purple-400" />
          <CommandInput
            placeholder="type your drink..."
            value={query}
            onValueChange={setQuery}
            className="flex h-14 w-full rounded-md bg-transparent py-3 text-lg outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 text-white border-0"
          />
        </div>
        {open && (
          <CommandList className="max-h-[300px]">
            {loading ? (
              <div className="py-6 text-center text-sm text-zinc-400">Searching...</div>
            ) : (
              <>
                <CommandEmpty className="py-6 text-center text-sm text-zinc-400">
                  No drinks found.
                </CommandEmpty>
                <CommandGroup>
                  {drinks.map((drink) => (
                    <CommandItem
                      key={drink.id}
                      value={`${drink.brand} ${drink.flavor}`}
                      onSelect={() => handleSelect(drink)}
                      className="cursor-pointer data-[selected=true]:bg-purple-600/20 data-[selected=true]:text-purple-200 text-zinc-300 hover:text-white"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <div className="font-semibold text-white">{drink.brand}</div>
                          <div className="text-sm text-zinc-400">{drink.flavor}</div>
                        </div>
                        <div className="flex flex-col items-end text-xs text-zinc-500">
                          <span>{drink.size_ml}ml</span>
                          {drink.caffeine_mg && <span>{drink.caffeine_mg}mg caffeine</span>}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        )}
      </Command>

      {selectedDrink && (
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-900/40 to-black/40 border border-purple-500/30 rounded-lg backdrop-blur-sm">
          <h3 className="text-white font-semibold text-lg">
            {selectedDrink.brand} - {selectedDrink.flavor}
          </h3>
          <div className="mt-2 text-sm text-zinc-300">
            <p>Size: {selectedDrink.size_ml}ml</p>
            {selectedDrink.caffeine_mg && <p>Caffeine: {selectedDrink.caffeine_mg}mg</p>}
          </div>
        </div>
      )}
    </div>
  );
}
