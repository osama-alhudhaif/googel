CREATE TABLE `puzzles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`question` text NOT NULL,
	`type` varchar(50) NOT NULL,
	`answer` varchar(255) NOT NULL,
	`location` text NOT NULL,
	`latitude` varchar(20),
	`longitude` varchar(20),
	`hint` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `puzzles_id` PRIMARY KEY(`id`),
	CONSTRAINT `puzzles_date_unique` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `userProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`puzzleId` int NOT NULL,
	`solved` int NOT NULL DEFAULT 0,
	`solvedAt` timestamp,
	`attempts` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProgress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `userProgress` ADD CONSTRAINT `userProgress_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userProgress` ADD CONSTRAINT `userProgress_puzzleId_puzzles_id_fk` FOREIGN KEY (`puzzleId`) REFERENCES `puzzles`(`id`) ON DELETE no action ON UPDATE no action;