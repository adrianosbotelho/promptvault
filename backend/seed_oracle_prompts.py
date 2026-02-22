"""
Script to seed the database with sample Oracle tuning prompts for testing.
Run this script to add example prompts related to Oracle database tuning.
"""
import sys
from datetime import datetime
from sqlalchemy.orm import Session

# Add the backend directory to the path
sys.path.insert(0, '.')

from app.core.database import SessionLocal
from app.models.database import Prompt, PromptVersion
from app.services.prompt_service import PromptService
from app.models.prompt import PromptCreate


def seed_oracle_prompts():
    """Seed database with Oracle tuning prompts."""
    db: Session = SessionLocal()
    
    try:
        # Sample Oracle tuning prompts
        prompts_data = [
            {
                "name": "Oracle SQL Query Optimization",
                "description": "Best practices for optimizing SQL queries in Oracle databases",
                "content": """
You are an Oracle database tuning expert. Analyze the following SQL query and provide optimization recommendations:

1. Check for missing indexes on WHERE clause columns
2. Verify if statistics are up to date
3. Review execution plan for full table scans
4. Suggest query rewrite opportunities
5. Recommend partitioning strategies if applicable
6. Analyze join order and methods
7. Check for unnecessary function calls in WHERE clauses
8. Review hint usage and suggest appropriate hints

SQL Query:
{query}

Provide specific recommendations with expected performance improvements.
"""
            },
            {
                "name": "Oracle Index Tuning Strategy",
                "description": "Guidelines for creating and maintaining optimal indexes in Oracle",
                "content": """
As an Oracle DBA, provide index tuning recommendations:

1. Identify columns that would benefit from indexes:
   - Columns in WHERE clauses
   - Columns in JOIN conditions
   - Columns in ORDER BY clauses
   - Foreign key columns

2. Index types to consider:
   - B-tree indexes for most cases
   - Bitmap indexes for low cardinality columns
   - Function-based indexes for expressions
   - Composite indexes for multiple columns

3. Index maintenance:
   - Monitor index usage with DBA_INDEX_USAGE
   - Rebuild indexes if fragmentation > 30%
   - Update statistics regularly
   - Consider invisible indexes for testing

4. Common mistakes to avoid:
   - Over-indexing (too many indexes slow down DML)
   - Indexing low selectivity columns
   - Not considering index selectivity

Provide specific index recommendations for the following scenario:
{scenario}
"""
            },
            {
                "name": "Oracle Execution Plan Analysis",
                "description": "How to read and interpret Oracle execution plans for performance tuning",
                "content": """
You are an Oracle performance tuning specialist. Analyze the following execution plan and provide insights:

Execution Plan Analysis Checklist:

1. Cost Analysis:
   - Total cost of the query
   - Cost per operation
   - Identify high-cost operations

2. Access Methods:
   - Full table scans (FTS) - usually bad
   - Index scans - preferred
   - Index range scans
   - Index unique scans

3. Join Methods:
   - Nested loops - good for small datasets
   - Hash joins - good for larger datasets
   - Sort merge joins - for sorted data

4. Cardinality Estimates:
   - Check if estimates match actual rows
   - Large discrepancies indicate stale statistics

5. Red Flags:
   - Cartesian joins
   - Full table scans on large tables
   - High buffer gets
   - Excessive recursive calls

Execution Plan:
{execution_plan}

Provide detailed analysis and recommendations.
"""
            },
            {
                "name": "Oracle Statistics Collection Best Practices",
                "description": "Guidelines for collecting and maintaining optimizer statistics in Oracle",
                "content": """
As an Oracle database administrator, provide recommendations for statistics collection:

1. Automatic Statistics Collection:
   - Enable automatic statistics gathering (default)
   - Configure maintenance windows
   - Monitor statistics collection jobs

2. Manual Statistics Collection:
   - Use DBMS_STATS.GATHER_TABLE_STATS for specific tables
   - Use DBMS_STATS.GATHER_SCHEMA_STATS for schemas
   - Use DBMS_STATS.GATHER_DATABASE_STATS for full database

3. Statistics Collection Options:
   - ESTIMATE_PERCENT: Use AUTO_SAMPLE_SIZE for large tables
   - METHOD_OPT: Use 'FOR ALL COLUMNS SIZE AUTO' for histograms
   - GRANULARITY: Use 'ALL' for partitioned tables
   - CASCADE: Include index statistics

4. When to Collect Statistics:
   - After bulk data loads
   - After significant data changes (>10%)
   - After index creation or rebuild
   - Before major query tuning sessions

5. Statistics Locking:
   - Lock statistics for stable tables
   - Unlock before manual collection
   - Use DBMS_STATS.LOCK_TABLE_STATS

Provide specific recommendations for:
{scenario}
"""
            },
            {
                "name": "Oracle Partitioning Strategy",
                "description": "Best practices for partitioning tables in Oracle databases",
                "content": """
You are an Oracle database architect. Provide partitioning recommendations:

1. Partitioning Types:
   - Range partitioning: For date-based data
   - Hash partitioning: For even distribution
   - List partitioning: For discrete values
   - Composite partitioning: Combining methods

2. When to Partition:
   - Tables larger than 2GB
   - Tables with time-based data
   - Tables requiring partition pruning
   - Tables needing partition-level maintenance

3. Partition Key Selection:
   - Choose columns frequently used in WHERE clauses
   - Ensure even data distribution
   - Consider partition pruning benefits

4. Partition Maintenance:
   - Add new partitions for range partitioning
   - Drop old partitions (DROP PARTITION)
   - Merge partitions (MERGE PARTITION)
   - Split partitions (SPLIT PARTITION)
   - Exchange partitions for data loading

5. Performance Benefits:
   - Partition pruning reduces I/O
   - Parallel operations per partition
   - Partition-level indexes
   - Faster maintenance operations

Provide partitioning strategy for:
{table_description}
"""
            },
            {
                "name": "Oracle AWR Report Analysis",
                "description": "How to analyze Oracle AWR (Automatic Workload Repository) reports",
                "content": """
As an Oracle performance analyst, analyze AWR reports and provide recommendations:

1. Top SQL Statements:
   - Identify high-load SQL statements
   - Check execution counts and elapsed time
   - Review buffer gets and disk reads
   - Look for SQL statements with high CPU time

2. Wait Events Analysis:
   - Identify top wait events
   - db file sequential read: Index scans
   - db file scattered read: Full table scans
   - buffer busy waits: Hot blocks
   - enqueue waits: Lock contention

3. Instance Efficiency:
   - Buffer Hit Ratio: Should be > 90%
   - Library Cache Hit Ratio: Should be > 95%
   - Parse to Execute Ratio: Should be low
   - Soft Parse Ratio: Should be > 95%

4. Time Model Statistics:
   - DB time: Total database time
   - SQL execute elapsed time
   - Parse time elapsed
   - Hard parse elapsed time

5. Recommendations:
   - Tune top SQL statements
   - Address wait events
   - Optimize memory allocation
   - Review initialization parameters

AWR Report Summary:
{awr_summary}

Provide detailed analysis and action items.
"""
            },
            {
                "name": "Oracle Memory Tuning",
                "description": "Guidelines for tuning Oracle memory parameters (SGA, PGA)",
                "content": """
You are an Oracle DBA specializing in memory tuning. Provide recommendations:

1. SGA Components:
   - Shared Pool: For SQL and PL/SQL
   - Buffer Cache: For data blocks
   - Large Pool: For parallel operations
   - Java Pool: For Java objects
   - Streams Pool: For Streams processing

2. PGA (Program Global Area):
   - Sort area size
   - Hash area size
   - Work area size policy (AUTO or MANUAL)

3. Memory Tuning Steps:
   - Enable Automatic Memory Management (AMM) or ASMM
   - Monitor memory usage with V$SGASTAT
   - Check for shared pool fragmentation
   - Review buffer cache hit ratio
   - Monitor PGA usage with V$PGASTAT

4. Common Issues:
   - Shared pool too small: ORA-04031 errors
   - Buffer cache too small: High disk I/O
   - PGA too small: Disk sorts instead of memory sorts

5. Best Practices:
   - Use SGA_TARGET and PGA_AGGREGATE_TARGET
   - Let Oracle manage memory automatically
   - Monitor and adjust based on workload
   - Use AWR reports to identify memory issues

Current Memory Configuration:
{memory_config}

Provide tuning recommendations.
"""
            },
            {
                "name": "Oracle Lock Contention Resolution",
                "description": "How to identify and resolve lock contention issues in Oracle",
                "content": """
As an Oracle DBA, help resolve lock contention issues:

1. Identifying Locks:
   - Query V$LOCK to see current locks
   - Query V$SESSION to see blocking sessions
   - Use DBA_BLOCKERS and DBA_WAITERS views
   - Check AWR reports for enqueue waits

2. Lock Types:
   - Row-level locks (TX): Most common
   - Table locks (TM): DDL operations
   - Library cache locks: SQL parsing
   - Dictionary locks: Schema changes

3. Common Causes:
   - Long-running transactions
   - Uncommitted transactions
   - Application design issues
   - Missing indexes causing table locks

4. Resolution Steps:
   - Identify blocking session
   - Check what the session is doing
   - Kill blocking session if necessary (ALTER SYSTEM KILL SESSION)
   - Review application code for commit frequency
   - Add appropriate indexes

5. Prevention:
   - Keep transactions short
   - Commit frequently in batch jobs
   - Use appropriate isolation levels
   - Monitor for lock waits proactively

Lock Information:
{lock_details}

Provide resolution steps.
"""
            }
        ]
        
        print("Seeding Oracle tuning prompts...")
        
        for prompt_data in prompts_data:
            # Check if prompt already exists
            existing = db.query(Prompt).filter(Prompt.name == prompt_data["name"]).first()
            if existing:
                print(f"  - Prompt '{prompt_data['name']}' already exists, skipping...")
                continue
            
            # Create prompt using PromptService
            prompt_create = PromptCreate(
                name=prompt_data["name"],
                description=prompt_data["description"],
                content=prompt_data["content"].strip()
            )
            
            try:
                prompt = PromptService.create_prompt(db, prompt_create)
                print(f"  ✓ Created prompt: '{prompt.name}' (ID: {prompt.id})")
            except Exception as e:
                print(f"  ✗ Error creating prompt '{prompt_data['name']}': {e}")
                db.rollback()
                continue
        
        db.commit()
        print(f"\n✓ Successfully seeded {len(prompts_data)} Oracle tuning prompts!")
        print("\nYou can now test the semantic search endpoint:")
        print("  GET /api/v1/prompts/search?q=oracle tuning")
        print("  GET /api/v1/prompts/search?q=index optimization")
        print("  GET /api/v1/prompts/search?q=execution plan")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding prompts: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed_oracle_prompts()
