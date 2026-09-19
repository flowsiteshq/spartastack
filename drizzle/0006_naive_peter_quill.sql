ALTER TABLE `users` ADD `phone` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `onboardingMode` enum('stack_owner','member');--> statement-breakpoint
ALTER TABLE `users` ADD `onboardingCompletedAt` timestamp;