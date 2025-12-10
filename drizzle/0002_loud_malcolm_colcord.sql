ALTER TABLE `events` MODIFY COLUMN `keywords` varchar(255);--> statement-breakpoint
ALTER TABLE `events` MODIFY COLUMN `timeRange` varchar(50);--> statement-breakpoint
ALTER TABLE `events` MODIFY COLUMN `isProposal` int NOT NULL;--> statement-breakpoint
ALTER TABLE `events` MODIFY COLUMN `isProposal` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `events` ADD `minParticipants` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `events` ADD `isConfirmed` int DEFAULT 0 NOT NULL;