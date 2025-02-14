import type { Database } from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

interface AnalyzedTrade {
    id: string;
    marketId: string;
    marketTitle: string;
    recommendedPosition: string;
    confidence: number;
    reasoning: string;
    risks: string[];
    opportunities: string[];
    createdAt: string;
    result: string;
}

interface BuyTrade {
    id: string;
    marketId: string;
    position: string;
    amount: number;
    createdAt: string;
    resolutionTimestamp: string;
    isResolved: boolean;
    resultPosition?: string;
}

interface Result {
    id: string;
    marketId: string;
    result: string;
    createdAt: string;
}

interface UserTrade {
    id: string;
    marketId: string;
    position: string;
    amount: number;
    result: string;
    profit: number;
    createdAt: string;
}

// Add row type definitions
interface AnalyzedTradeRow {
    id: string;
    market_id: string;
    market_title: string;
    recommended_position: string;
    confidence: number;
    reasoning: string;
    risks: string;
    opportunities: string;
    created_at: string;
    result: string | null;
}

interface BuyTradeRow {
    id: string;
    market_id: string;
    position: string;
    amount: number;
    created_at: string;
    resolution_timestamp: string;
    is_resolved: boolean;
    result_position: string | null;
}

interface ResultRow {
    id: string;
    market_id: string;
    result: string;
    created_at: string;
}

interface UserTradeRow {
    id: string;
    market_id: string;
    position: string;
    amount: number;
    result: string | null;
    profit: number | null;
    created_at: string;
}

export class PredictionMarketDatabase {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
        this.initializeSchema();
    }

    private initializeSchema() {
        this.db.exec(`PRAGMA foreign_keys = ON;`);

        // Create AnalyzedTrades Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS analyzed_trades (
                id TEXT PRIMARY KEY,
                market_id TEXT NOT NULL,
                market_title TEXT NOT NULL,
                recommended_position TEXT NOT NULL,
                confidence REAL NOT NULL,
                reasoning TEXT NOT NULL,
                risks TEXT NOT NULL,
                opportunities TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                result TEXT
            );
        `);

        // Create BuyTrades Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS buy_trades (
                id TEXT PRIMARY KEY,
                market_id TEXT NOT NULL,
                position TEXT NOT NULL,
                amount REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                resolution_timestamp DATETIME NOT NULL,
                is_resolved BOOLEAN DEFAULT FALSE,
                result_position TEXT
            );
        `);

        // Create Results Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS results (
                id TEXT PRIMARY KEY,
                market_id TEXT NOT NULL,
                result TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create UserTrades Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS user_trades (
                id TEXT PRIMARY KEY,
                market_id TEXT NOT NULL,
                position TEXT NOT NULL,
                amount REAL NOT NULL,
                result TEXT,
                profit REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    // AnalyzedTrade Methods
    async addAnalyzedTrade(trade: Omit<AnalyzedTrade, 'id'>): Promise<string> {
        const id = uuidv4();
        const sql = `
            INSERT INTO analyzed_trades (
                id,
                market_id,
                market_title,
                recommended_position,
                confidence,
                reasoning,
                risks,
                opportunities,
                result
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;

        try {
            this.db.prepare(sql).run(
                id,
                trade.marketId,
                trade.marketTitle,
                trade.recommendedPosition,
                trade.confidence,
                trade.reasoning,
                JSON.stringify(trade.risks),
                JSON.stringify(trade.opportunities),
                trade.result || null
            );
            return id;
        } catch (error) {
            console.error("Error adding analyzed trade:", error);
            throw error;
        }
    }

    getAnalyzedTrade(id: string): AnalyzedTrade | null {
        const sql = `SELECT * FROM analyzed_trades WHERE id = ?;`;
        try {
            const row = this.db.prepare(sql).get(id) as AnalyzedTradeRow;
            if (!row) return null;
            return {
                id: row.id,
                marketId: row.market_id,
                marketTitle: row.market_title,
                recommendedPosition: row.recommended_position,
                confidence: row.confidence,
                reasoning: row.reasoning,
                risks: JSON.parse(row.risks),
                opportunities: JSON.parse(row.opportunities),
                createdAt: row.created_at,
                result: row.result
            };
        } catch (error) {
            console.error("Error getting analyzed trade:", error);
            return null;
        }
    }

    getAnalyzedTradeByMarket(marketId: string): AnalyzedTrade | null {
        const sql = `SELECT * FROM analyzed_trades WHERE market_id = ? ORDER BY created_at DESC LIMIT 1;`;
        try {
            const row = this.db.prepare(sql).get(marketId) as AnalyzedTradeRow;
            if (!row) return null;
            
            return {
                id: row.id,
                marketId: row.market_id,
                marketTitle: row.market_title,
                recommendedPosition: row.recommended_position,
                confidence: row.confidence,
                reasoning: row.reasoning,
                risks: JSON.parse(row.risks),
                opportunities: JSON.parse(row.opportunities),
                createdAt: row.created_at,
                result: row.result
            };
        } catch (error) {
            console.error("Error getting analyzed trade by market:", error);
            return null;
        }
    }

    // BuyTrade Methods
    async addBuyTrade(trade: Omit<BuyTrade, 'id'>): Promise<string> {
        const id = uuidv4();
        const sql = `
            INSERT INTO buy_trades (
                id,
                market_id,
                position,
                amount,
                resolution_timestamp,
                is_resolved,
                result_position
            ) VALUES (?, ?, ?, ?, ?, ?, ?);
        `;

        try {
            this.db.prepare(sql).run(
                id,
                trade.marketId,
                trade.position,
                trade.amount,
                trade.resolutionTimestamp,
                trade.isResolved ? 1 : 0,
                trade.resultPosition || null
            );
            return id;
        } catch (error) {
            console.error("Error adding buy trade:", error);
            throw error;
        }
    }

    getBuyTrade(id: string): BuyTrade | null {
        const sql = `SELECT * FROM buy_trades WHERE id = ?;`;
        try {
            const row = this.db.prepare(sql).get(id) as BuyTradeRow;
            if (!row) return null;
            return {
                id: row.id,
                marketId: row.market_id,
                position: row.position,
                amount: row.amount,
                createdAt: row.created_at,
                resolutionTimestamp: row.resolution_timestamp,
                isResolved: row.is_resolved,
                resultPosition: row.result_position
            };
        } catch (error) {
            console.error("Error getting buy trade:", error);
            return null;
        }
    }

    getBuyTradesByMarket(marketId: string): BuyTrade[] {
        const sql = `SELECT * FROM buy_trades WHERE market_id = ? ORDER BY created_at DESC;`;
        try {
            const rows = this.db.prepare(sql).all(marketId) as BuyTradeRow[];
            return rows.map(row => ({
                id: row.id,
                marketId: row.market_id,
                position: row.position,
                amount: row.amount,
                createdAt: row.created_at,
                resolutionTimestamp: row.resolution_timestamp,
                isResolved: row.is_resolved,
                resultPosition: row.result_position
            }));
        } catch (error) {
            console.error("Error getting buy trades by market:", error);
            return [];
        }
    }

    // Result Methods
    async addResult(result: Omit<Result, 'id'>): Promise<string> {
        const id = uuidv4();
        const sql = `
            INSERT INTO results (
                id,
                market_id,
                result
            ) VALUES (?, ?, ?);
        `;

        try {
            this.db.prepare(sql).run(
                id,
                result.marketId,
                result.result
            );
            return id;
        } catch (error) {
            console.error("Error adding result:", error);
            throw error;
        }
    }

    getResult(id: string): Result | null {
        const sql = `SELECT * FROM results WHERE id = ?;`;
        try {
            const row = this.db.prepare(sql).get(id) as ResultRow;
            if (!row) return null;
            return {
                id: row.id,
                marketId: row.market_id,
                result: row.result,
                createdAt: row.created_at
            };
        } catch (error) {
            console.error("Error getting result:", error);
            return null;
        }
    }

    getResultByMarket(marketId: string): Result | null {
        const sql = `SELECT * FROM results WHERE market_id = ? ORDER BY created_at DESC LIMIT 1;`;
        try {
            const row = this.db.prepare(sql).get(marketId) as ResultRow;
            if (!row) return null;
            return {
                id: row.id,
                marketId: row.market_id,
                result: row.result,
                createdAt: row.created_at
            };
        } catch (error) {
            console.error("Error getting result by market:", error);
            return null;
        }
    }

    // UserTrade Methods
    async addUserTrade(trade: Omit<UserTrade, 'id'>): Promise<string> {
        const id = uuidv4();
        const sql = `
            INSERT INTO user_trades (
                id,
                market_id,
                position,
                amount,
                result,
                profit
            ) VALUES (?, ?, ?, ?, ?, ?);
        `;

        try {
            this.db.prepare(sql).run(
                id,
                trade.marketId,
                trade.position,
                trade.amount,
                trade.result || null,
                trade.profit || null
            );
            return id;
        } catch (error) {
            console.error("Error adding user trade:", error);
            throw error;
        }
    }

    getUserTrade(id: string): UserTrade | null {
        const sql = `SELECT * FROM user_trades WHERE id = ?;`;
        try {
            const row = this.db.prepare(sql).get(id) as UserTradeRow;
            if (!row) return null;
            return {
                id: row.id,
                marketId: row.market_id,
                position: row.position,
                amount: row.amount,
                result: row.result,
                profit: row.profit,
                createdAt: row.created_at
            };
        } catch (error) {
            console.error("Error getting user trade:", error);
            return null;
        }
    }

    getUserTradesByMarket(marketId: string): UserTrade[] {
        const sql = `SELECT * FROM user_trades WHERE market_id = ? ORDER BY created_at DESC;`;
        try {
            const rows = this.db.prepare(sql).all(marketId) as UserTradeRow[];
            return rows.map(row => ({
                id: row.id,
                marketId: row.market_id,
                position: row.position,
                amount: row.amount,
                result: row.result,
                profit: row.profit,
                createdAt: row.created_at
            }));
        } catch (error) {
            console.error("Error getting user trades by market:", error);
            return [];
        }
    }

    // Update Methods
    updateAnalyzedTradeResult(id: string, result: string): boolean {
        const sql = `UPDATE analyzed_trades SET result = ? WHERE id = ?;`;
        try {
            const updateResult = this.db.prepare(sql).run(result, id);
            return updateResult.changes > 0;
        } catch (error) {
            console.error("Error updating analyzed trade result:", error);
            return false;
        }
    }

    updateUserTradeResult(id: string, result: string, profit: number): boolean {
        const sql = `UPDATE user_trades SET result = ?, profit = ? WHERE id = ?;`;
        try {
            const updateResult = this.db.prepare(sql).run(result, profit, id);
            return updateResult.changes > 0;
        } catch (error) {
            console.error("Error updating user trade result:", error);
            return false;
        }
    }

    // Analytics Methods
    getMarketStats(marketId: string) {
        const sql = `
            SELECT 
                COUNT(*) as total_trades,
                AVG(amount) as avg_amount,
                SUM(CASE WHEN profit > 0 THEN 1 ELSE 0 END) as profitable_trades,
                AVG(profit) as avg_profit
            FROM user_trades 
            WHERE market_id = ? AND result IS NOT NULL;
        `;
        try {
            return this.db.prepare(sql).get(marketId);
        } catch (error) {
            console.error("Error getting market stats:", error);
            return null;
        }
    }

    // Add method to update resolution
    async updateTradeResolution(id: string, resultPosition: string): Promise<boolean> {
        const sql = `UPDATE buy_trades SET is_resolved = 1, result_position = ? WHERE id = ?;`;
        try {
            const result = this.db.prepare(sql).run(resultPosition, id);
            return result.changes > 0;
        } catch (error) {
            console.error("Error updating trade resolution:", error);
            return false;
        }
    }

    // Add method to get unresolved trades
    getUnresolvedTrades(): BuyTrade[] {
        const sql = `SELECT * FROM buy_trades WHERE is_resolved = FALSE AND datetime(resolution_timestamp, 'unixepoch') <= datetime('now');`;
        try {
            const rows = this.db.prepare(sql).all() as BuyTradeRow[];
            return rows.map(row => ({
                id: row.id,
                marketId: row.market_id,
                position: row.position,
                amount: row.amount,
                createdAt: row.created_at,
                resolutionTimestamp: row.resolution_timestamp,
                isResolved: Boolean(row.is_resolved),
                resultPosition: row.result_position
            }));
        } catch (error) {
            console.error("Error getting unresolved trades:", error);
            return [];
        }
    }

    closeConnection(): void {
        this.db.close();
    }
}