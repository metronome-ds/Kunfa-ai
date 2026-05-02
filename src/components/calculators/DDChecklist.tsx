'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/common/Card';
import { getDueDiligenceChecklist, type DDItem } from '@/lib/calculators';
import { Badge } from '@/components/common/Badge';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';

type Priority = 'high' | 'medium' | 'low';
type Category = 'Financial' | 'Legal' | 'Operational' | 'Commercial' | 'Technical';

export function DDChecklist() {
  const allItems = getDueDiligenceChecklist();
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');

  const toggleItem = (id: string) => {
    const newCompleted = new Set(completedItems);
    if (newCompleted.has(id)) {
      newCompleted.delete(id);
    } else {
      newCompleted.add(id);
    }
    setCompletedItems(newCompleted);
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Filter items by priority
  const filteredItems = useMemo(() => {
    if (filterPriority === 'all') {
      return allItems;
    }
    return allItems.filter((item) => item.priority === filterPriority);
  }, [filterPriority, allItems]);

  // Group by category
  const itemsByCategory = useMemo(() => {
    const grouped: Record<Category, DDItem[]> = {
      Financial: [],
      Legal: [],
      Operational: [],
      Commercial: [],
      Technical: [],
    };

    filteredItems.forEach((item) => {
      grouped[item.category].push(item);
    });

    return grouped;
  }, [filteredItems]);

  // Calculate progress
  const totalItems = allItems.length;
  const completedCount = completedItems.size;
  const overallProgress = (completedCount / totalItems) * 100;

  const getCategoryProgress = (category: Category) => {
    const categoryItems = allItems.filter((item) => item.category === category);
    const completedInCategory = categoryItems.filter((item) => completedItems.has(item.id)).length;
    return {
      completed: completedInCategory,
      total: categoryItems.length,
      percentage: (completedInCategory / categoryItems.length) * 100,
    };
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-amber-100 text-amber-800';
      case 'low':
        return 'bg-[var(--accent-soft)] text-[var(--ink)]';
    }
  };

  const getCategoryIcon = (category: Category) => {
    const icons: Record<Category, string> = {
      Financial: '📊',
      Legal: '⚖️',
      Operational: '⚙️',
      Commercial: '💼',
      Technical: '💻',
    };
    return icons[category];
  };

  const categories: Category[] = ['Financial', 'Legal', 'Operational', 'Commercial', 'Technical'];

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card title="Due Diligence Progress" subtitle="Track your team's progress on all DD items">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--ink-soft)]">Overall Completion</span>
              <span className="text-sm font-bold text-[var(--ink)]">
                {completedCount} of {totalItems}
              </span>
            </div>
            <div className="w-full bg-[var(--bg-sunk)] rounded-full h-3 overflow-hidden">
              <div
                className="bg-[var(--ink)] h-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className="text-sm text-[var(--ink-soft)] mt-2">{overallProgress.toFixed(0)}% complete</p>
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
            {categories.map((category) => {
              const progress = getCategoryProgress(category);
              return (
                <div key={category} className="p-3 bg-[var(--bg-sunk)] rounded-lg border border-[var(--line)]">
                  <p className="text-sm font-medium text-[var(--ink-soft)] mb-2">{getCategoryIcon(category)} {category}</p>
                  <p className="text-lg font-bold text-[var(--ink)]">
                    {progress.completed}/{progress.total}
                  </p>
                  <div className="w-full bg-gray-300 rounded-full h-2 mt-2 overflow-hidden">
                    <div
                      className="bg-green-600 h-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Filter */}
      <div className="flex gap-2">
        <span className="text-sm font-medium text-[var(--ink-soft)] py-2">Filter by Priority:</span>
        <button
          onClick={() => setFilterPriority('all')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterPriority === 'all'
              ? 'bg-[var(--ink)] text-white'
              : 'bg-[var(--bg-sunk)] text-[var(--ink-soft)] hover:bg-[var(--bg-sunk)]'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterPriority('high')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterPriority === 'high'
              ? 'bg-red-600 text-white'
              : 'bg-[var(--bg-sunk)] text-[var(--ink-soft)] hover:bg-[var(--bg-sunk)]'
          }`}
        >
          High Priority
        </button>
        <button
          onClick={() => setFilterPriority('medium')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterPriority === 'medium'
              ? 'bg-amber-600 text-white'
              : 'bg-[var(--bg-sunk)] text-[var(--ink-soft)] hover:bg-[var(--bg-sunk)]'
          }`}
        >
          Medium Priority
        </button>
        <button
          onClick={() => setFilterPriority('low')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterPriority === 'low'
              ? 'bg-[var(--ink)] text-white'
              : 'bg-[var(--bg-sunk)] text-[var(--ink-soft)] hover:bg-[var(--bg-sunk)]'
          }`}
        >
          Low Priority
        </button>
      </div>

      {/* Checklist by Category */}
      {categories.map((category) => (
        <div key={category}>
          {itemsByCategory[category].length > 0 && (
            <Card
              title={`${getCategoryIcon(category)} ${category} Due Diligence`}
              subtitle={`${getCategoryProgress(category).completed} of ${getCategoryProgress(category).total} items completed`}
            >
              <div className="space-y-2">
                {itemsByCategory[category].map((item) => {
                  const isCompleted = completedItems.has(item.id);
                  const isExpanded = expandedItems.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-lg transition-all ${
                        isCompleted
                          ? 'border-green-200 bg-green-50'
                          : 'border-[var(--line)] hover:border-[var(--line-strong)] bg-[var(--bg-elev)] hover:bg-[var(--bg-sunk)]'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleItem(item.id)}
                            className={`mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              isCompleted
                                ? 'bg-green-600 border-green-600'
                                : 'border-[var(--line-strong)] hover:border-gray-400'
                            }`}
                          >
                            {isCompleted && <Check className="h-3 w-3 text-white" />}
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h4
                                  className={`font-medium text-sm transition-all ${
                                    isCompleted ? 'text-[var(--ink-mute)] line-through' : 'text-[var(--ink)]'
                                  }`}
                                >
                                  {item.itemName}
                                </h4>
                                <Badge className={`mt-2 ${getPriorityColor(item.priority)}`}>
                                  {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                                </Badge>
                              </div>

                              {/* Expand Button */}
                              <button
                                onClick={() => toggleExpanded(item.id)}
                                className="text-[var(--ink-faint)] hover:text-[var(--ink-soft)] transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-5 w-5" />
                                ) : (
                                  <ChevronDown className="h-5 w-5" />
                                )}
                              </button>
                            </div>

                            {/* Description - Expandable */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-[var(--line)]">
                                <p className="text-sm text-[var(--ink-soft)]">{item.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      ))}

      {/* Empty State */}
      {Object.values(itemsByCategory).every((items) => items.length === 0) && (
        <Card>
          <div className="text-center py-12">
            <p className="text-[var(--ink-soft)]">No items match the selected filter</p>
          </div>
        </Card>
      )}
    </div>
  );
}
