import {
  ShoppingCart,
  Coffee,
  Home,
  Car,
  Utensils,
  Film,
  Heart,
  Plane,
  Briefcase,
  Gift,
  DollarSign,
  TrendingUp,
  PiggyBank,
  CreditCard,
} from 'lucide-react';

export const getCategoryIcon = (categoryName: string) => {
  const lowerName = categoryName.toLowerCase();
  if (
    lowerName.includes('food') ||
    lowerName.includes('restaurant') ||
    lowerName.includes('dining')
  )
    return <Utensils className="w-3 h-3" />;
  if (lowerName.includes('groceries') || lowerName.includes('shopping'))
    return <ShoppingCart className="w-3 h-3" />;
  if (lowerName.includes('coffee') || lowerName.includes('cafe'))
    return <Coffee className="w-3 h-3" />;
  if (lowerName.includes('rent') || lowerName.includes('home') || lowerName.includes('housing'))
    return <Home className="w-3 h-3" />;
  if (lowerName.includes('transport') || lowerName.includes('car') || lowerName.includes('gas'))
    return <Car className="w-3 h-3" />;
  if (lowerName.includes('entertainment') || lowerName.includes('movie'))
    return <Film className="w-3 h-3" />;
  if (lowerName.includes('health') || lowerName.includes('medical'))
    return <Heart className="w-3 h-3" />;
  if (lowerName.includes('travel') || lowerName.includes('vacation'))
    return <Plane className="w-3 h-3" />;
  if (lowerName.includes('work') || lowerName.includes('business'))
    return <Briefcase className="w-3 h-3" />;
  if (lowerName.includes('gift')) return <Gift className="w-3 h-3" />;
  if (lowerName.includes('salary') || lowerName.includes('income'))
    return <DollarSign className="w-3 h-3" />;
  if (lowerName.includes('investment')) return <TrendingUp className="w-3 h-3" />;
  if (lowerName.includes('savings')) return <PiggyBank className="w-3 h-3" />;
  return <CreditCard className="w-3 h-3" />;
};
