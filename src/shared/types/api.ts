import { type CommentType } from "../../components/Comment";

export interface Anime {
  id: number;
  image: string;
  title_ru: string;
  title_original: string;
  episodes_released: number;
  episodes_total: number | null;
  grade: number;
  description: string;
  favorites_count: number;
  duration: number;
  country: string;
  season: number;
  year: string;
  genres: string;
  studio: string;
  author: string;
  director: string;
  category: {
    name: string
  };
  status: {
    name: string
  };
  age_rating: number;
  related_releases: Anime[];
  profile_list_status: number;
  vote_1_count: number;
  vote_2_count: number;
  vote_3_count: number;
  vote_4_count: number;
  vote_5_count: number;
  vote_count: number;
  screenshot_images: string[];
  comments: CommentType[];
  note: string;
  watching_count: number;
  plan_count: number;
  completed_count: number;
  hold_on_count: number;
  dropped_count: number;
  is_favorite: boolean;
}

export interface Filter {
  country?: 'Япония' | 'Китай' | 'Южная Корея' | null;
  category_id?: 1|2|3|4; //1 - Сериал, 2 - Фильм, 3 - OVA, 4 - Дорама? (На момент 25.07.2026 ни одной дорамы в приложении нету)
  status_id?: 1|2|3; //1 - Вышел, 2 - Выходит, 3 - Анонс 
  genres?: string[]; 
  is_genres_exclude_mode_enabled?: boolean;
  profile_list_exclusions?: number[]; // 0 - Избранное, 1 - Смотрю, 2 - В планах, 3 - Просмотрено, 4 - Отложено, 5 - Брошено
  start_year?: number;
  end_year?: number;
  episode_duration_from?: number;
  episode_duration_to?: number;
  episodes_from?: number;
  episodes_to?: number;
  season?: 1|2|3|4; // 1 - Зима, 2 - Весна, 3 - Лето, 4 - Осень
  age_ratings?: 1|2|3|4|5; //1 - 0+, 2 - 6+, 3 - 12+, 4 - 16+, 5 - 18+
  sort?: 0|1|2|3; // 0 - По дате добавления, 1 - По рейтингу, 2 - По годам, 3 - По популярности
}

export interface Profile {
  id: number;
  avatar: string;
  history: Anime[];
  // TODO: расширить
}