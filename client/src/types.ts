export interface User {
  id: number;
  name: string;
  email: string;
}

export interface BoardSummary {
  id: number;
  user_id: number;
  title: string;
  created_at: string;
  card_count: number;
}

export interface Card {
  id: number;
  list_id: number;
  title: string;
  description: string;
  position: number;
  created_at: string;
}

export interface List {
  id: number;
  board_id: number;
  title: string;
  position: number;
  cards: Card[];
}

export interface Board {
  id: number;
  user_id: number;
  title: string;
  created_at: string;
  lists: List[];
}
