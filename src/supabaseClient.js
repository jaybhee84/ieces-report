import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://joilvslvsioayrjshuxg.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_aozkBamT5C58KY03X9kUgA_iehy73ZU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const BUCKET = 'news-photos'
export const TABLE = 'news_articles'

// Add export for MOOE Liquidation Report table
export const MOOE_TABLE = 'MOOE liquidation report'