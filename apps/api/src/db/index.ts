import { env } from "@api/env";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { bunRedisCache } from "./cache/bun-redis-cache";
import * as schema from "./schema";

let _db: NodePgDatabase<typeof schema> | null = null;

const createDb = (): NodePgDatabase<typeof schema> => {
	if (_db) {
		return _db;
	}

	_db = drizzle({
		connection: {
			host: env.DATABASE_HOST,
			port: env.DATABASE_PORT,
			user: env.DATABASE_USERNAME,
			password: env.DATABASE_PASSWORD,
			database: env.DATABASE_NAME,
			ssl:
				env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
		},
		cache: bunRedisCache({
			config: { ex: 60 },
		}),
		schema,
	});

	return _db;
};

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export const db = new Proxy({} as Database, {
	get: (target, prop) => {
		const actualDb = createDb();
		return actualDb[prop as keyof typeof actualDb];
	},
});
