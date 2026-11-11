CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`game_id` integer,
	`target_user_id` text,
	`review_id` text,
	`rating` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activities_user_created_idx` ON `activities` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `activities_created_idx` ON `activities` (`created_at`);--> statement-breakpoint
CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `follows` (
	`follower_id` text NOT NULL,
	`following_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`follower_id`, `following_id`),
	FOREIGN KEY (`follower_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`following_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `follows_following_idx` ON `follows` (`following_id`);--> statement-breakpoint
CREATE TABLE `game_categories` (
	`game_id` integer NOT NULL,
	`kind` text NOT NULL,
	`slug` text NOT NULL,
	PRIMARY KEY(`game_id`, `kind`, `slug`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `game_categories_kind_slug_idx` ON `game_categories` (`kind`,`slug`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`source` text NOT NULL,
	`steam_app_id` integer,
	`wikipedia_title` text,
	`epic` text,
	`store_links` text NOT NULL,
	`platforms` text NOT NULL,
	`short_description` text NOT NULL,
	`about` text NOT NULL,
	`release_date` text,
	`release_year` integer,
	`developers` text NOT NULL,
	`publishers` text NOT NULL,
	`steam_genres` text NOT NULL,
	`genres` text NOT NULL,
	`art_styles` text NOT NULL,
	`tier` text NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`cover_image` text NOT NULL,
	`hero_image` text,
	`header_image` text,
	`screenshots` text NOT NULL,
	`trailers` text NOT NULL,
	`metacritic` integer,
	`steam_reviews` text,
	`player_stats` text,
	`website` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_slug_uq` ON `games` (`slug`);--> statement-breakpoint
CREATE INDEX `games_steam_idx` ON `games` (`steam_app_id`);--> statement-breakpoint
CREATE INDEX `games_release_idx` ON `games` (`release_date`);--> statement-breakpoint
CREATE TABLE `library_entries` (
	`user_id` text NOT NULL,
	`game_id` integer NOT NULL,
	`played` integer DEFAULT false NOT NULL,
	`playing` integer DEFAULT false NOT NULL,
	`wishlisted` integer DEFAULT false NOT NULL,
	`liked` integer DEFAULT false NOT NULL,
	`rating` integer,
	`started_playing_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `game_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `library_game_idx` ON `library_entries` (`game_id`);--> statement-breakpoint
CREATE INDEX `library_user_updated_idx` ON `library_entries` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `review_votes` (
	`review_id` text NOT NULL,
	`user_id` text NOT NULL,
	`helpful` integer,
	`funny` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`review_id`, `user_id`),
	FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`game_id` integer NOT NULL,
	`body` text NOT NULL,
	`recommended` integer NOT NULL,
	`hours_played` real,
	`contains_spoilers` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_user_game_uq` ON `reviews` (`user_id`,`game_id`);--> statement-breakpoint
CREATE INDEX `reviews_game_created_idx` ON `reviews` (`game_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `top_games` (
	`user_id` text NOT NULL,
	`game_id` integer NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`user_id`, `position`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `top_games_user_game_uq` ON `top_games` (`user_id`,`game_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`location` text,
	`avatar_hue` integer DEFAULT 160 NOT NULL,
	`avatar_game_id` integer,
	`banner_game_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`avatar_game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`banner_game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_uq` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uq` ON `users` (`email`);