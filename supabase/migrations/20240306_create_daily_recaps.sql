-- Create the daily_recaps table
create table if not exists daily_recaps (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    date date not null,
    metrics jsonb not null default '{
        "tasksCreated": 0,
        "tasksCompleted": 0,
        "timeTracked": 0,
        "taskTypes": {}
    }',
    activity_periods jsonb not null default '[]',
    insights jsonb not null default '{
        "quote": "",
        "daySummary": "",
        "energyPatterns": [],
        "taskImpact": [],
        "coachInsights": [],
        "powerQuestions": [],
        "tomorrowFocus": []
    }',
    user_preferences jsonb not null default '{
        "autoGenerate": true,
        "expandByDefault": false,
        "coachingStyle": "balanced",
        "notificationsEnabled": true,
        "visibleSections": {
            "quote": true,
            "daySummary": true,
            "energyPatterns": true,
            "taskImpact": true,
            "coachInsights": true,
            "powerQuestions": true,
            "tomorrowFocus": true
        }
    }',
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    constraint unique_user_date unique(user_id, date)
);

-- Create indexes for better query performance
create index daily_recaps_user_id_idx on daily_recaps(user_id);
create index daily_recaps_date_idx on daily_recaps(date);
create index daily_recaps_user_date_idx on daily_recaps(user_id, date);

-- Create trigger for updating updated_at timestamp
create or replace function update_daily_recaps_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger daily_recaps_updated_at
    before update on daily_recaps
    for each row
    execute function update_daily_recaps_updated_at();

-- Enable Row Level Security
alter table daily_recaps enable row level security;

-- Create RLS policies
create policy "Users can view their own recaps"
    on daily_recaps for select
    using (auth.uid() = user_id);

create policy "Users can insert their own recaps"
    on daily_recaps for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own recaps"
    on daily_recaps for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own recaps"
    on daily_recaps for delete
    using (auth.uid() = user_id); 