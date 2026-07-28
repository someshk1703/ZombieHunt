Meet the Workflows: Project Coordination
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
My dear friends, we’ve arrived at the grand finale - the most spectacular room of all in Peli’s Agent Factory!

We’ve journeyed through 18 categories of workflows - from triage bots to code quality improvers, from security guards to creative poets, culminating in advanced analytics that use machine learning to understand agent behavior patterns. Each workflow handles its individual task admirably.

But here’s the ultimate challenge: how do you coordinate multiple agents working toward a shared goal? How do you break down a large initiative like “migrate all workflows to a new engine” into trackable sub-tasks that different agents can tackle? How do you monitor progress, alert on delays, and ensure the whole is greater than the sum of its parts? This final post explores planning, task-decomposition and project coordination workflows - the orchestration layer that proves AI agents can handle not just individual tasks, but entire structured projects requiring careful coordination and progress tracking.

Planning & Project Coordination Workflows
These agents coordinate multi-agent plans and projects:

Plan Command - Breaks down issues into actionable sub-tasks via /plan command - 514 merged PRs out of 761 proposed (67% merge rate)
Discussion Task Miner - Extracts actionable tasks from discussion threads - 60 merged PRs out of 105 proposed (57% merge rate)
Plan Command has contributed 514 merged PRs out of 761 proposed (67% merge rate), providing on-demand task decomposition that breaks complex issues into actionable sub-tasks. This is the highest-volume workflow by attribution in the entire factory. Developers can comment /plan on any issue to get an AI-generated breakdown into actionable sub-issues that agents can work on. A verified example causal chain: Discussion #7631 → Issue #8058 → PR #8110.

Discussion Task Miner has contributed 60 merged PRs out of 105 proposed (57% merge rate), continuously scanning discussions to extract actionable tasks that might otherwise be lost. The workflow demonstrates perfect causal chain attribution: when it creates an issue from a discussion, and Copilot Coding Assistant later fixes that issue, the resulting PR is correctly attributed to Discussion Task Miner. A verified example: Discussion #13934 → Issue #14084 → PR #14129. Recent merged examples include fixing firewall SSL-bump field extraction and adding security rationale to permissions documentation.

We learned that individual agents are great at focused tasks, but orchestrating multiple agents toward a shared goal requires careful architecture. Project coordination isn’t just about breaking down work - it’s about discovering work (Task Miner), planning work (Plan Command), and tracking work (Workflow Health Manager).

These workflows implement patterns like epic issues, progress tracking, and deadline management. They prove that AI agents can handle not just individual tasks, but entire projects when given proper coordination infrastructure.

Using These Workflows
You can add these workflows to your own repository and remix them. Get going with our Quick Start, then run one of the following:

Plan Command:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/plan.md

Discussion Task Miner:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/discussion-task-miner.md

Then edit and remix the workflow specifications to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
What We’ve Learned
Throughout this 19-part journey, we’ve explored workflows spanning from simple triage bots to sophisticated multi-phase improvers, from security guards to creative poets, from individual task automation to organization-wide orchestration.

The key insight? AI agents are most powerful when they’re specialized, well-coordinated, and designed for their specific context. No single agent does everything - instead, we have an ecosystem where each agent excels at its particular job, and they work together through careful orchestration.

We’ve learned that observability is essential, that incremental progress beats heroic efforts, that security needs careful boundaries, and that even “fun” workflows can drive meaningful engagement. We’ve discovered that AI agents can maintain documentation, manage campaigns, analyze their own behavior, and continuously improve codebases - when given the right architecture and guardrails.

As you build your own agentic workflows, remember: start small, measure everything, iterate based on real usage, and don’t be afraid to experiment. The workflows we’ve shown you evolved through experimentation and real-world use. Yours will too.

This is part 19 (final) of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Advanced Analytics & ML
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Ooh! Time to plunge into the data wonderland at Peli’s Agent Factory! Where numbers dance and patterns sing!

In our previous post, we explored organization and cross-repo workflows that operate at enterprise scale - analyzing dozens of repositories together to find patterns and outliers that single-repo analysis would miss. We learned that perspective matters: what looks normal in isolation might signal drift at scale.

Beyond tracking basic metrics (run time, cost, success rate), we wanted deeper insights into how our agents actually behave and how developers interact with them. What patterns emerge from thousands of agent prompts? What makes some PR conversations more effective than others? How do usage patterns reveal improvement opportunities? This is where we brought out the big guns: machine learning, natural language processing, sentiment analysis, and clustering algorithms. Advanced analytics workflows don’t just count things - they understand them, finding patterns and insights that direct observation would never reveal.

Advanced Analytics & ML Workflows
These agents use sophisticated analysis techniques to extract insights:

Copilot Session Insights - Analyzes Copilot coding agent usage patterns and metrics - 32 analysis discussions
Copilot PR NLP Analysis - Natural language processing on PR conversations
Prompt Clustering Analysis - Clusters and categorizes agent prompts using ML - 27 analysis discussions
Copilot Agent Analysis - Deep analysis of agent behavior patterns - 48 daily analysis discussions
Prompt Clustering Analysis has created 27 analysis discussions using ML to categorize thousands of agent prompts - for example, #6918 clustering agent prompts to identify patterns and optimization opportunities. It revealed patterns we never noticed (“oh, 40% of our prompts are about error handling”).

Copilot PR NLP Analysis applies natural language processing to PR conversations, performing sentiment analysis and identifying linguistic patterns across agent interactions. It found that PRs with questions in the title get faster review.

Copilot Session Insights has created 32 analysis discussions examining Copilot coding agent usage patterns and metrics across the workflow ecosystem. It identifies common patterns and failure modes.

Copilot Coding Agent Analysis has created 48 daily analysis discussions providing deep analysis of agent behavior patterns - for example, #6913 with the daily Copilot coding agent analysis.

What we learned: meta-analysis is powerful - using AI to analyze AI systems reveals insights that direct observation misses. These workflows helped us understand not just what our agents do, but how they behave and how users interact with them.

Using These Workflows
You can add these workflows to your own repository and remix it as follows:

Copilot Session Insights:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/copilot-agent-analysis.md

Copilot PR NLP Analysis:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/copilot-pr-nlp-analysis

Prompt Clustering Analysis:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/prompt-clustering-analysis.md

Copilot Agent Analysis:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/copilot-agent-analysis.md

Then edit and remix the workflow specifications to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
Next Up: Project Coordination Workflows
We’ve reached the final stop: coordinating multiple agents toward shared, complex goals across extended timelines.

Continue reading: Project Coordination Workflows →

This is part 18 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Organization & Cross-Repo
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Let’s zoom out at Peli’s Agent Factory!

In our previous post, we explored multi-phase improver workflows - our most ambitious agents that tackle big projects over multiple days, maintaining state and making incremental progress. These workflows proved that AI agents can handle complex, long-running initiatives when given the right architecture.

But all that sophisticated functionality has focused on a single repository. What happens when you zoom out to organization scale? What insights emerge when you analyze dozens or hundreds of repositories together? What looks perfectly normal in one repo might be a red flag across an organization. Organization and cross-repo workflows operate at enterprise scale, requiring careful permission management, thoughtful rate limiting, and different analytical lenses. Let’s explore workflows that see the forest, not just the trees.

Organization & Cross-Repo Workflows
These agents work at organization scale, across multiple repositories:

Org Health Report - Organization-wide repository health metrics - 4 organization health discussions created
Stale Repo Identifier - Identifies inactive repositories - 2 issues flagging truly stale repos
Ubuntu Image Analyzer - Documents GitHub Actions runner environments - 4 merged PRs out of 8 proposed (50% merge rate)
Scaling agents across an entire organization changes the game. Org Health Report has created 4 organization health discussions analyzing dozens of repositories at scale - for example, #6777 with the December 2025 organization health report. It identifies patterns and outliers (“these three repos have no tests, these five haven’t been updated in months”).

Stale Repo Identifier has created 2 issues flagging truly stale repositories for organizational hygiene - for example, #5384 identifying Skills-Based-Volunteering-Public as truly stale. It helps find abandoned projects that should be archived or transferred.

We learned that cross-repo insights are different - what looks fine in one repository might be an outlier across the organization. These workflows require careful permission management (reading across repos needs organization-level tokens) and thoughtful rate limiting (you can hit API limits fast when analyzing 50+ repos).

Ubuntu Image Analyzer has contributed 4 merged PRs out of 8 proposed (50% merge rate), documenting GitHub Actions runner environments to keep the team informed about available tools and versions. It’s wonderfully meta - it documents the very environment that runs our agents.

Using These Workflows
You can add these workflows to your own repository and remix them. Get going with our Quick Start, then run one of the following:

Org Health Report:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/org-health-report.md

Stale Repo Identifier:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/stale-repo-identifier.md

Ubuntu Image Analyzer:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/ubuntu-image-analyzer.md

Then edit and remix the workflow specifications to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
Next Up: Advanced Analytics & ML Workflows
Cross-repo insights reveal patterns, but we wanted to go even deeper - using machine learning to understand agent behavior.

Continue reading: Advanced Analytics & ML Workflows →

This is part 17 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Multi-Phase Improvers
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Let’s continue our journey through Peli’s Agent Factory!

In our previous post, we explored infrastructure workflows - the meta-monitoring layer that validates MCP servers, checks tool configurations, and ensures the platform itself stays healthy. These workflows watch the watchers, providing visibility into the invisible plumbing.

Most workflows we’ve seen so far run once and complete: analyze this PR, triage that issue, test this deployment. They’re ephemeral - they execute, produce results, and disappear. But what about projects that are too big to tackle in a single run? What about initiatives that require research, setup, and incremental implementation? Traditional CI/CD is built for stateless execution, but we discovered something powerful: workflows that maintain state across days, working a little bit each day like a persistent team member who never takes breaks. Welcome to our most ambitious experiment - multi-phase improvers that prove AI agents can handle complex, long-running projects.

Multi-Phase Improver Workflows
These are some of our most ambitious agents - they tackle big projects over multiple days:

Daily Backlog Burner - Systematically works through issues and PRs, one day at a time
Daily Perf Improver - Three-phase performance optimization (research, setup, implement)
Daily QA - Continuous quality assurance that never sleeps
Daily Accessibility Review - WCAG compliance checking with Playwright
PR Fix - On-demand slash command to fix failing CI checks (super handy!)
This is where we got experimental with agent persistence and multi-day workflows. Traditional CI runs are ephemeral, but these workflows maintain state across days using repo-memory. The Daily Perf Improver runs in three phases - research (find bottlenecks), setup (create profiling infrastructure), implement (optimize). It’s like having a performance engineer who works a little bit each day. The Daily Backlog Burner systematically tackles our issue backlog - one issue per day, methodically working through technical debt. We learned that incremental progress beats heroic sprints - these agents never get tired, never get distracted, and never need coffee breaks. The PR Fix workflow is our emergency responder - when CI fails, invoke /pr-fix and it investigates and attempts repairs.

These workflows prove that AI agents can handle complex, long-running projects when given the right architecture.

Using These Workflows
You can add these workflows to your own repository and remix them. Get going with our Quick Start, then run one of the following:

Daily Backlog Burner:

Terminal window
gh aw add-wizard githubnext/agentics/workflows/daily-backlog-burner.md

Daily Perf Improver:

Terminal window
gh aw add-wizard githubnext/agentics/workflows/daily-perf-improver.md

Daily QA:

Terminal window
gh aw add-wizard githubnext/agentics/workflows/daily-qa.md

Daily Accessibility Review:

Terminal window
gh aw add-wizard githubnext/agentics/workflows/daily-accessibility-review.md

PR Fix:

Terminal window
gh aw add-wizard githubnext/agentics/workflows/pr-fix.md

Then edit and remix the workflow specifications to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
Next Up: Organization & Cross-Repo Workflows
Single-repository workflows are powerful, but what happens when you scale to an entire organization with dozens of repositories?

Continue reading: Organization & Cross-Repo Workflows →

This is part 16 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Tool & Infrastructure
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Delighted to have you back on our journey through Peli’s Agent Factory! Now, prepare yourself for something quite peculiar - the room where we watch the watchers!

In our previous post, we explored testing and validation workflows that continuously verify our systems function correctly - running smoke tests, checking documentation across devices, and catching regressions before users notice them. We learned that trust must be verified.

But here’s a question that kept us up at night: what if the infrastructure itself fails? What if MCP servers are misconfigured, tools become unavailable, or agents can’t access the capabilities they need? Testing the application is one thing; monitoring the platform that runs AI agents is another beast entirely. Tool and infrastructure workflows provide meta-monitoring - they watch the watchers, validate configurations, and ensure the invisible plumbing stays functional. Welcome to the layer where we monitor agents monitoring agents monitoring code. Yes, it gets very meta.

Tool & Infrastructure Workflows
These agents monitor and analyze the agentic infrastructure itself:

MCP Inspector - Validates Model Context Protocol configurations - ensures agents can access tools
GitHub MCP Tools Report - Analyzes available MCP tools - 5 merged PRs out of 6 proposed (83% merge rate)
Agent Performance Analyzer - Meta-orchestrator for agent quality - 29 issues created, 14 leading to PRs (8 merged)
Infrastructure for AI agents is different from traditional infrastructure - you need to validate that tools are available, properly configured, and actually working. The MCP Inspector continuously validates Model Context Protocol server configurations because a misconfigured MCP server means an agent can’t access the tools it needs.

GitHub MCP Tools Report Generator has contributed 5 merged PRs out of 6 proposed (83% merge rate), analyzing MCP tool availability and keeping tool configurations up to date. For example, PR #13169 updates MCP server tool configurations.

Agent Performance Analyzer has created 29 issues identifying performance problems across the agent ecosystem, and 14 of those issues led to PRs (8 merged) by downstream agents - for example, it detected that draft PRs accounted for 9.6% of open PRs, created issue #12168, which led to #12174 implementing automated draft cleanup.

We learned that layered observability is crucial: you need monitoring at the infrastructure level (are servers up?), the tool level (can agents access what they need?), and the agent level (are they performing well?).

These workflows provide visibility into the invisible.

Using These Workflows
You can add these workflows to your own repository and remix them. Get going with our Quick Start, then run one of the following:

MCP Inspector:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/mcp-inspector.md

GitHub MCP Tools Report:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/github-mcp-tools-report.md

Agent Performance Analyzer:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/agent-performance-analyzer.md

Then edit and remix the workflow specifications to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
Next Up: Multi-Phase Improver Workflows
Most workflows we’ve seen are stateless - they run, complete, and disappear. But what if agents could maintain memory across days?

Continue reading: Multi-Phase Improver Workflows →

This is part 15 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Testing & Validation
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Right this way! Let’s continue our grand tour of Peli’s Agent Factory! Into the verification chamber where nothing escapes scrutiny!

In our previous post, we explored ChatOps workflows - agents that respond to slash commands and GitHub reactions, providing on-demand assistance with full context.

But making code better is only half the battle. We also need to ensure it keeps working. As we refactor, optimize, and evolve our codebase, how do we know we haven’t broken something? How do we catch regressions before users do? That’s where testing and validation workflows come in - the skeptical guardians that continuously verify our systems still function as expected. We learned that AI infrastructure needs constant health checks, because what worked yesterday might silently fail today. These workflows embody trust but verify.

Testing & Validation Workflows
These agents keep everything running smoothly through continuous testing:

Code Quality & Test Validation
Daily Testify Uber Super Expert - Analyzes test files daily and suggests testify-based improvements - 19 issues created, 13 led to merged PRs (100% causal chain merge rate)
Daily Test Improver - Identifies coverage gaps and implements new tests incrementally
Daily Compiler Quality Check - Analyzes compiler code to ensure it meets quality standards
User Experience & Integration Testing
Daily Multi-Device Docs Tester - Tests documentation across devices with Playwright - 2 merged PRs out of 2 proposed (100% merge rate)
CLI Consistency Checker - Inspects the CLI for inconsistencies, typos, and documentation gaps - 80 merged PRs out of 102 proposed (78% merge rate)
CI/CD Optimization
CI Coach - Analyzes CI pipelines and suggests optimizations - 9 merged PRs out of 9 proposed (100% merge rate)
Workflow Health Manager - Meta-orchestrator monitoring health of all agentic workflows - 40 issues created, 5 direct PRs + 14 causal chain PRs merged
The Daily Testify Expert has created 19 issues analyzing test quality, and 13 of those issues led to merged PRs by downstream agents - a perfect 100% causal chain merge rate. For example, issue #13701 led to #13722 modernizing console render tests with testify assertions. The Daily Test Improver works alongside it to identify coverage gaps and implement new tests.

The Multi-Device Docs Tester uses Playwright to test our documentation on different screen sizes - it has created 2 PRs (both merged), including adding —network host to Playwright Docker containers. It found mobile rendering issues we never would have caught manually. The CLI Consistency Checker has contributed 80 merged PRs out of 102 proposed (78% merge rate), maintaining consistency in CLI interface and documentation. Recent examples include removing undocumented CLI commands and fixing upgrade command documentation.

CI Optimization Coach has contributed 9 merged PRs out of 9 proposed (100% merge rate), optimizing CI pipelines for speed and efficiency with perfect execution. Examples include removing unnecessary test dependencies and fixing duplicate test execution.

The Workflow Health Manager has created 40 issues monitoring the health of all other workflows, with 25 of those issues leading to 34 PRs (14 merged) by downstream agents - plus 5 direct PRs merged. For example, issue #14105 about a missing runtime file led to #14127 fixing the workflow configuration.

These workflows embody the principle: trust but verify. Just because it worked yesterday doesn’t mean it works today.

Using These Workflows
You can add these workflows to your own repository and remix them. Get going with our Quick Start, then run one of the following:

Daily Testify Uber Super Expert:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/daily-testify-uber-super-expert.md

Daily Test Improver:

Terminal window
gh aw add-wizard githubnext/agentics/daily-test-improver

Daily Compiler Quality Check:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/daily-compiler-quality.md

Daily Multi-Device Docs Tester:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/daily-multi-device-docs-tester.md

CLI Consistency Checker:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/cli-consistency-checker.md

CI Coach:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/ci-coach.md

Workflow Health Manager:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/workflow-health-manager.md

Then edit and remix the workflow specifications to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
Next Up: Monitoring the Monitors
But what about the infrastructure itself? Who watches the watchers? Time to go meta.

Continue reading: Tool & Infrastructure Workflows →

This is part 14 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Interactive & ChatOps
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Onwards, onwards! Let’s keep exploring the wonders of Peli’s Agent Factory! To the command center where instant magic happens!

In our previous post, we explored creative and culture workflows - agents that bring joy, build team culture, and create moments of delight. We discovered that AI agents don’t have to be all business; they can have personality while making work more enjoyable.

But sometimes you need help right now, at the exact moment you’re stuck on a problem. You don’t want to wait for a scheduled run - you want to summon an expert agent with a command. That’s where interactive workflows and ChatOps come in. These agents respond to slash commands and GitHub reactions, providing on-demand assistance with full context of the current situation.

We learned that the right agent at the right moment with the right information is a valuable addition to an agent portfolio.

Interactive & ChatOps Workflows
These agents respond to commands, providing on-demand assistance whenever you need it:

Q - Workflow optimizer that investigates performance and creates PRs - 69 merged PRs out of 88 proposed (78% merge rate)
Grumpy Reviewer - Performs critical code reviews with personality - creates issues for downstream agents
Workflow Generator - Creates new workflows from issue requests - scaffolds workflow files
Interactive workflows changed how we think about agent invocation. Instead of everything running on a schedule, these respond to slash commands and reactions - /q summons the workflow optimizer, a reaction triggers analysis. Q (yes, named after the James Bond quartermaster) became our go-to troubleshooter - it has contributed 69 merged PRs out of 88 proposed (78% merge rate), responding to commands and investigating workflow issues on demand. Recent examples include fixing the daily-fact workflow action-tag and configuring PR triage reports with 1-day expiration.

The Grumpy Reviewer performs opinionated code reviews, creating issues that flag security risks and code quality concerns (e.g., #13990 about risky event triggers) for downstream agents to fix. It gave us surprisingly valuable feedback with a side of sass (“This function is so nested it has its own ZIP code”).

Workflow Generator creates new agentic workflows from issue requests, scaffolding the markdown workflow files that other agents then refine (e.g., #13379 requesting AWF mode changes).

We learned that context is king - these agents work because they’re invoked at the right moment with the right context, not because they run on a schedule.

Using These Workflows
You can add these workflows to your own repository and remix them. Get going with our Quick Start, then run one of the following:

Q:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/q.md

Grumpy Reviewer:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/grumpy-reviewer.md

Workflow Generator:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/workflow-generator.md

Then edit and remix the workflow specifications to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
Next Up: Testing & Validation Workflows
While ChatOps agents respond to commands, we also need workflows that continuously verify our systems still function as expected.

Continue reading: Testing & Validation Workflows →

This is part 13 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Teamwork & Culture
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Oh, my dear friends! Let’s explore the playful workshop - the most fun corner of Peli’s Agent Factory!

In our previous post, we explored security and compliance workflows - the essential guardrails that manage vulnerability campaigns, validate network security, and prevent credential exposure. These workflows let us sleep soundly knowing our agents operate within safe boundaries.

But here’s the thing: work doesn’t have to be all business. While we’ve built serious, production-critical workflows for quality, releases, and security, we also discovered something unexpected - AI agents can bring joy, build team culture, and create moments of delight. Not every workflow needs to solve a critical problem; some can simply make your day better. Let’s explore the playful side of our agent factory, where we learned that personality and fun drive engagement just as powerfully as utility.

Teamwork & Culture Workflows
These agents facilitate team communication and remind us that work can be fun:

Daily Team Status - Shares team mood and status updates - 22 issues, 17 discussions (plus 2 causal chain PRs!)
Daily News - Curates relevant news for the team - 45 news digest discussions
Poem Bot - Responds to /poem-bot commands with creative verses (yes, really)
Weekly Issue Summary - Creates digestible summaries complete with charts and trends - 5 weekly analysis discussions
Daily Repo Chronicle - Narrates the day’s activity like a storyteller - 6 chronicle discussions
The Poem Bot started as a whimsy in our Copilot for PRs project in 2022. Someone said “wouldn’t it be funny if we had an agent that writes poems about our code?” and then we built it. Poem Bot responds to /poem-bot commands with creative verses about code, adding a touch of whimsy to the development workflow. We learned that AI agents don’t have to be all business - they can build culture and create moments of joy.

Daily News has created 45 news digest discussions curating relevant developments for the team - for example, #6932 with the daily status roundup. It shares links, adds commentary and connects them to our work.

Daily Team Status has created 22 issues and 17 discussions sharing daily team status updates - for example, #6930 with the daily team status report. Two of its issues even led to merged PRs by downstream agents, showing that even “soft” workflows can drive concrete improvements.

Weekly Issue Summary has created 5 weekly analysis discussions with digestible summaries, charts, and trends - for example, #5844 analyzing the week of December 1-8, 2025.

Daily Repo Chronicle has created 6 chronicle discussions narrating the repository’s activity like a storyteller - for example, #6750 chronicling a development surge with 42 active PRs.

A theme here is the reduction of cognitive load. Having agents summarize and narrate daily activity means we don’t have to mentally parse long lists of issues or PRs. Instead, we get digestible stories that highlight what’s important. This frees up mental bandwidth for actual work.

Another theme is that tone can help make things more enjoyable. The Daily Repo Chronicle started writing summaries in a narrative, almost journalistic style. The outputs from AI agents don’t have to be robotic - they can have personality while still being informative.

These communication workflows help build team cohesion and remind us that work can be delightful.

Using These Workflows
You can add these workflows to your own repository and remix them. Get going with our Quick Start, then run one of the following:

Daily Team Status:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/daily-team-status.md

Daily News:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/daily-news.md

Poem Bot:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/poem-bot.md

Weekly Issue Summary:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/weekly-issue-summary.md

Daily Repo Chronicle:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/daily-repo-chronicle.md

Then edit and remix the workflow specifications to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
Next Up: Summon an Agent on Demand
Scheduled workflows are great, but sometimes you need help right now. Enter ChatOps and interactive workflows.

Continue reading: Interactive & ChatOps Workflows →

This is part 12 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Security-related
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Splendid! How great to have you back at Peli’s Agent Factory! Now, let me show you the guardian chamber - where the watchful protectors stand vigil!

In our previous post, we explored operations and release workflows that handle the critical process of shipping software - building, testing, generating release notes, and publishing. These workflows need to be rock-solid reliable because they represent the moment when our work reaches users.

But reliability alone isn’t enough - we also need security. When AI agents can access APIs, modify code, and interact with external services, security becomes paramount. How do we ensure agents only access authorized resources? How do we track vulnerabilities and enforce compliance deadlines? How do we prevent credential exposure? That’s where security and compliance workflows become our essential guardrails - the watchful guardians that let us sleep soundly at night.

Security-related Workflows
These agents are our security guards, keeping watch and enforcing the rules:

Security Compliance - Runs vulnerability campaigns with deadline tracking
Firewall - Tests network security and validates rules - 59 daily firewall report discussions, 5 smoke test issues
Daily Secrets Analysis - Scans for exposed credentials (yes, it happens)
Daily Malicious Code Scan - Reviews recent code changes for suspicious patterns
Static Analysis Report - Daily security scans using zizmor, poutine, and actionlint - 57 analysis discussions plus 12 Zizmor security reports
Security Compliance manages vulnerability remediation campaigns with deadline tracking, ensuring security issues are addressed within defined SLAs - perfect for those “audit in 3 weeks” panic moments.

The Firewall workflow has created 59 daily firewall report discussions and 5 smoke test issues, validating that our agents can’t access unauthorized resources - for example, #6943 with the daily firewall analysis. It’s the bouncer that enforces network rules.

Daily Secrets Analysis scans for exposed credentials in commits and discussions, providing an automated security net against accidental secret exposure - catching those “oops, I committed my API key” moments before they become incidents.

Daily Malicious Code Scan reviews recent code changes for suspicious patterns, adding an automated defense layer against supply chain attacks.

Static Analysis Report has created 57 analysis discussions plus 12 Zizmor security reports, running comprehensive daily security audits using industry-standard tools - for example, #6973 with the latest static analysis findings and #3033 with a Zizmor security analysis. This shows how traditional security tools can be integrated into an AI agent workflow.

Using These Workflows
You can add these workflows to your own repository and remix them. Get going with our Quick Start, then run one of the following:

Security Compliance:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/security-compliance.md

Firewall:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/firewall.md

Daily Secrets Analysis:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/daily-secrets-analysis.md

Daily Malicious Code Scan:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/daily-malicious-code-scan.md

Static Analysis Report:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/static-analysis-report.md

Then edit and remix the workflow specifications to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
Next Up: Teamwork & Culture Workflows
After all this serious talk, let’s explore the fun side: agents that bring joy and build team culture.

Continue reading: Teamwork & Culture Workflows →

This is part 11 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Operations & Release
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Ah! Right this way to our next chamber in Peli’s Agent Factory! The chamber where our AI agents enhance the magical moment of shipping software.

In our previous post, we explored metrics and analytics workflows - the agents that monitor other agents, turning raw activity data into actionable insights.

Operations & Release Workflows
The agents that help us actually ship software:

Changeset - Manages version bumps and changelog entries for releases - 22 merged PRs out of 28 proposed (78% merge rate)
Daily Workflow Updater - Keeps GitHub Actions and dependencies current
Shipping software is stressful enough without worrying about whether you formatted your release notes correctly.

Changeset Generator has contributed 22 merged PRs out of 28 proposed (78% merge rate), automating version bumps and changelog generation for every release. It analyzes commits since the last release, determines the appropriate version bump (major, minor, patch), and updates the changelog accordingly.

Daily Workflow Updater keeps GitHub Actions and dependencies current, ensuring workflows don’t fall behind on security patches or new features.

Using These Workflows
You can add these workflows to your own repository and remix them. Get going with our Quick Start, then run one of the following:

Changeset:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/changeset.md

Then edit and remix the workflow specifications to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
Next Up: Security-related Workflows
After all this focus on shipping, we need to talk about the guardrails: how do we ensure these powerful agents operate safely?

Continue reading: Security-related Workflows →

This is part 10 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Metrics & Analytics
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Excellent journey! Now it’s time to plunge into the observatory - the nerve center of Peli’s Agent Factory!

In our previous post, we explored quality and hygiene workflows - the vigilant caretakers that investigate failed CI runs, detect schema drift, and catch breaking changes before users do. These workflows maintain codebase health by spotting problems before they escalate.

When you’re running dozens of AI agents, how do you know if they’re actually working well? How do you spot performance issues, cost problems, or quality degradation? That’s where metrics and analytics workflows come in - they’re the agents that monitor other agents. The aim is to turn raw activity data into actionable insights.

Metrics & Analytics Workflows
Let’s take a look at these three workflows:

Metrics Collector - Tracks daily performance across the entire agent ecosystem
Portfolio Analyst - Identifies cost reduction opportunities
Audit Workflows - A meta-agent that audits all the other agents’ runs
The Metrics Collector has created 41 daily metrics discussions tracking performance across the agent ecosystem - for example, #6986 with the daily code metrics report. It became our central nervous system, gathering performance data that feeds into higher-level orchestrators.

Portfolio Analyst has created 7 portfolio analysis discussions identifying cost reduction opportunities and token optimization patterns - for example, #6499 with a weekly portfolio analysis. The workflow has identified workflows that were costing us money unnecessarily (turns out some agents were way too chatty with their LLM calls).

Audit Workflows is our most prolific discussion-creating agent with 93 audit report discussions and 9 issues, acting as a meta-agent that analyzes logs, costs, errors, and success patterns across all other workflow runs. Four of its issues led to PRs by downstream agents.

Observability isn’t optional when you’re running dozens of AI agents - it’s the difference between a well-oiled machine and an expensive black box.

Using These Workflows
You can add these workflows to your own repository and remix them. Get going with our Quick Start, then run one of the following:

Metrics Collector:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/metrics-collector.md

Portfolio Analyst:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/portfolio-analyst.md

Audit Workflows:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/audit-workflows.md

Then edit and remix the workflow specifications to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
Next Up: Operations & Release Workflows
Now that we can measure and optimize our agent ecosystem, let’s talk about the moment of truth: actually shipping software to users.

Continue reading: Operations & Release Workflows →

This is part 9 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Fault Investigation
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Ah, splendid! Welcome back to Peli’s Agent Factory! Come, let me show you the chamber where vigilant caretakers investigate faults before they escalate!

In our previous post, we explored issue and PR management workflows.

Now let’s shift from collaboration ceremony to fault investigation.

While issue workflows help us handle what comes in, fault investigation workflows act as vigilant caretakers - spotting problems before they escalate and keeping our codebase healthy. These are the agents that investigate failed CI runs, detect schema drift, and catch breaking changes before users do.

Fault Investigation Workflows
These are our diligent caretakers - the agents that spot problems before they become bigger problems:

CI Doctor - Investigates failed workflows and opens diagnostic issues - 9 merged PRs out of 13 proposed (69% merge rate)
Schema Consistency Checker - Detects when schemas, code, and docs drift apart - 55 analysis discussions created
Breaking Change Checker - Watches for changes that might break things for users - creates alert issues
The CI Doctor (also known as “CI Failure Doctor”) was one of our most important workflows. Instead of drowning in CI failure notifications, we now get timely, investigated failures with actual diagnostic insights. The agent doesn’t just tell us something broke - it analyzes logs, identifies patterns, searches for similar past issues, and even suggests fixes - even before the human has read the failure notification. CI Failure Doctor has contributed 9 merged PRs out of 13 proposed (69% merge rate), including fixes like adding Go module download pre-flight checks and adding retry logic to prevent proxy 403 failures. We learned that agents excel at the tedious investigation work that humans find draining.

The Schema Consistency Checker has created 55 analysis discussions examining schema drift between JSON schemas, Go structs, and documentation - for example, #7020 analyzing conditional logic consistency across the codebase. It caught drift that would have taken us days to notice manually.

Breaking Change Checker is a newer workflow that monitors for backward-incompatible changes and creates alert issues (e.g., #14113 flagging CLI version updates) before they reach production.

These “hygiene” workflows became our first line of defense, catching issues before they reached users.

The CI Doctor has inspired a growing range of similar workflows inside GitHub, where agents proactively do depth investigations of site incidents and failures. This is the future of operational excellence: AI agents kicking in immediately to do depth investigation, for faster organizational response.

Using These Workflows
You can add these workflows to your own repository and remix them. Get going with our Quick Start, then run one of the following:

CI Doctor:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/ci-doctor.md

Schema Consistency Checker:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/schema-consistency-checker.md

Breaking Change Checker:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/breaking-change-checker.md

Then edit and remix the workflow specifications to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
Next Up: Metrics & Analytics Workflows
Next up, we look at workflows which help us understand if the agent collection as a whole is working well That’s where metrics and analytics workflows come in.

Continue reading: Metrics & Analytics Workflows →

This is part 8 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Issue & PR Management
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Ah! Let’s discuss the art of managing issues and pull requests at Peli’s Agent Factory! A most delicious topic indeed!

In our previous post, we explored documentation and content workflows - agents that maintain glossaries, technical docs, slide decks, and blog content. We learned how we took a heterogeneous approach to documentation agents - some workflows generate content, others maintain it, and still others validate it.

Now let’s talk about the daily rituals of software development: managing issues and pull requests. GitHub provides excellent primitives for collaboration, but there’s ceremony involved - linking related issues, merging main into PR branches, assigning work, closing completed sub-issues, optimizing templates. These are small papercuts individually, but they can add up to significant friction.

Issue & PR Management Workflows
These agents enhance issue and pull request workflows:

Issue Arborist - Links related issues as sub-issues - 77 discussion reports and 18 parent issues created
Issue Monster - Assigns issues to the asynchronous GitHub Copilot coding agent one at a time - task dispatcher for the whole system
Mergefest - Automatically merges main branch into PR branches - orchestrator workflow
Sub Issue Closer - Closes completed sub-issues automatically - orchestrator workflow
The Issue Arborist is an organizational workflow that has created 77 discussion reports (titled “[Issue Arborist] Issue Arborist Report”) and 18 parent issues to group related sub-issues. It keeps the issue tracker organized by automatically linking related issues, building a dependency tree we’d never maintain manually. For example, #12037 grouped engine documentation updates.

The Issue Monster is the task dispatcher - it assigns issues to the GitHub platform’s asynchronous Copilot coding agent one at a time. It doesn’t create PRs itself, but enables every other agent’s work by feeding them tasks. This prevents the chaos of parallel work on the same codebase.

Mergefest is an orchestrator workflow that automatically merges main into PR branches, keeping long-lived PRs up to date without manual intervention. It eliminates the “please merge main” dance.

Sub Issue Closer automatically closes completed sub-issues when their parent issue is resolved, keeping the issue tracker clean.

Issue and PR management workflows don’t replace GitHub’s features; they enhance them, removing ceremony and making collaboration feel smoother.

Using These Workflows
You can add these workflows to your own repository and remix them. Get going with our Quick Start, then run one of the following:

Issue Arborist:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/issue-arborist.md

Issue Monster:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/issue-monster.md

Mergefest:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/mergefest.md

Sub Issue Closer:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/sub-issue-closer.md

Then edit and remix the workflow specifications to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
Next Up: Fault Investigation Workflows
Next up we look at agents that maintain codebase health - spotting problems before they escalate.

Continue reading: Fault Investigation Workflows →

This is part 7 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Continuous Documentation
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Step right up, step right up, and enter the documentation chamber of Peli’s Agent Factory! Pure imagination meets technical accuracy in this most delightful corner of our establishment!

In our previous posts, we explored autonomous cleanup agents - workflows that continuously improve code quality by simplifying complexity, refactoring structure, polishing style, and maintaining overall repository health. These agents never take a day off, quietly working to make our codebase better.

Now let’s address one of software development’s eternal challenges: keeping documentation accurate and up-to-date. Code evolves rapidly; docs… not so much. Terminology drifts, API examples become outdated, slide decks grow stale, and blog posts reference deprecated features. The question isn’t “can AI agents write good documentation?” but rather “can they maintain it as code changes?” Documentation and content workflows challenge conventional wisdom about AI-generated technical content. Spoiler: the answer involves human review, but it’s way better than the alternative (no docs at all).

Continuous Documentation Workflows
These agents maintain high-quality documentation and content:

Daily Documentation Updater - Reviews and updates documentation to ensure accuracy and completeness - 57 merged PRs out of 59 proposed (96% merge rate)
Glossary Maintainer - Keeps glossary synchronized with codebase - 10 merged PRs out of 10 proposed (100% merge rate)
Documentation Unbloat - Reviews and simplifies documentation by reducing verbosity - 88 merged PRs out of 103 proposed (85% merge rate)
Documentation Noob Tester - Tests documentation as a new user would, identifying confusing steps - 9 merged PRs (43% merge rate) via causal chain
Slide Deck Maintainer - Maintains presentation slide decks - 2 merged PRs out of 5 proposed (40% merge rate)
Multi-device Docs Tester - Tests documentation site across mobile, tablet, and desktop devices - 2 merged PRs out of 2 proposed (100% merge rate)
Blog Auditor - Verifies blog posts are accessible and contain expected content - 6 audits completed (5 passed, 1 flagged issues)
Documentation is where we challenged conventional wisdom. Can AI agents write good documentation?

The Technical Doc Writer generates API docs from code, but more importantly, it maintains them - updating docs when code changes. The Glossary Maintainer caught terminology drift (“we’re using three different terms for the same concept”).

The Slide Deck Maintainer keeps our presentation materials current without manual updates.

The Multi-device Docs Tester uses Playwright to verify our documentation site works across phones, tablets, and desktops - testing responsive layouts, accessibility, and interactive elements. It catches visual regressions and layout issues that only appear on specific screen sizes.

The Blog Auditor ensures our blog posts stay accurate as the codebase evolves - it flags outdated code examples and broken links. Blog Auditor is a validation-only workflow that creates audit reports rather than code changes. It has run 6 audits (5 passed, 1 flagged out-of-date content), confirming blog accuracy.

Documentation Noob Tester deserves special mention for its exploratory nature. It has produced 9 merged PRs out of 21 proposed (43% merge rate) through a causal chain: 62 discussions analyzed → 21 issues created → 21 PRs. The lower merge rate reflects this workflow’s exploratory nature - it identifies many potential improvements, some of which are too ambitious for immediate implementation. For example, Discussion #8477 led to Issue #8486 which spawned PRs #8716 and #8717, both merged.

AI-generated docs need human/agent review, but they’re dramatically better than no docs (which is often the alternative). Validation can be automated to a large extent, freeing writers to focus on content shaping, topic, clarity, tone, and accuracy.

In this collection of agents, we took a heterogeneous approach - some workflows generate content, others maintain it, and still others validate it. Other approaches are possible - all tasks can be rolled into a single agent. We found that it’s easier to explore the space by using multiple agents, to separate concerns, and that encouraged us to use agents for other communication outputs such as blogs and slides.

Using These Workflows
You can add these workflows to your own repository and remix them. Get going with our Quick Start, then run one of the following:

Daily Documentation Updater:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/daily-doc-updater.md

Glossary Maintainer:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/glossary-maintainer.md

Documentation Unbloat:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/unbloat-docs.md

Documentation Noob Tester:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/docs-noob-tester.md

Slide Deck Maintainer:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/slide-deck-maintainer.md

Multi-device Docs Tester:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/daily-multi-device-docs-tester.md

Blog Auditor:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/blog-auditor.md

Then edit and remix the workflow specifications to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
Next Up: Issue & PR Management Workflows
Beyond writing code and docs, we need to manage the flow of issues and pull requests. How do we keep collaboration smooth and efficient?

Continue reading: Issue & PR Management Workflows →

This is part 6 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Continuous Improvement
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Welcome back to Peli’s Agent Factory!

In our previous posts, we’ve explored autonomous cleanup agents. Now we complete the picture with agents that analyze dependencies, type safety, and overall repository quality.

Continuous Improvement Workflows
Go Module Usage Expert (aka Go Fan) - Daily Go module usage reviewer
Typist - Analyzes type usage patterns for improved safety
Functional Pragmatist - Applies functional techniques pragmatically
Repository Quality Improver - Holistic code quality analysis
Go Module Usage Expert: The Dependency Enthusiast 
The Go Module Usage Expert is perhaps the most uniquely characterized workflow in the factory - an “enthusiastic Go module expert” who performs daily deep-dive reviews of the project’s Go dependencies. This isn’t just dependency scanning - it’s thoughtful analysis of how well we’re using the tools we’ve chosen.

Most dependency tools focus on vulnerabilities or outdated versions. Go Module Usage Expert asks deeper and more positive questions: Are we using this module’s best features? Have recent updates introduced better patterns we should adopt? Could we use a more appropriate module for this use case? Are we following the module’s recommended practices?

Go Module Usage Expert uses an intelligent selection algorithm. It extracts direct dependencies from go.mod, fetches GitHub metadata for each dependency including last update time, sorts by recency to prioritize recently updated modules, uses round-robin selection to cycle through modules ensuring comprehensive coverage, and maintains persistent memory through cache-memory to track which modules were recently reviewed.

This ensures recently updated modules get reviewed first since new features might be relevant, all modules eventually get reviewed so nothing is forgotten, and reviews don’t repeat unnecessarily thanks to cache tracking.

For each module, Go Module Usage Expert researches the repository (releases, docs, best practices), analyzes actual usage patterns using Serena, and generates actionable recommendations. It saves summaries under scratchpad/mods/ and opens GitHub Discussions.

The output of Go Module Usage Expert is a discussion, which is then often “task mined” for actionable tasks using the ResearchPlanAssignOps design pattern.

Let’s take a look at an example of how this works:

Go Module Usage Expert created the Go Module Review: actionlint discussion after noticing the actionlint module was updated.
Peli requested the Plan agent mine for actionable tasks.
This created a parent issue and 5 sub-tasks.
The subtasks were then solved by further workflow runs. An example PR is Implement parallel multi-file actionlint execution.
Through this multi-agent causal chain pattern, Go Module Usage Expert has generated 58 merged PRs out of 74 proposed (78% merge rate) across 67 module reviews. Notable chains include: spinner improvements (4 PRs from briandowns/spinner review), MCP SDK v1.2.0 upgrade (5 PRs from go-sdk review), and terminal styling overhaul (3 PRs from lipgloss review).

Typist: The Type Safety Advocate
The Typist analyzes Go type usage patterns with a singular focus: improving type safety. It hunts for untyped code that should be strongly typed, and identifies duplicated type definitions that create confusion.

Typist looks for untyped usages: interface{} or any where specific types would be better, untyped constants that should have explicit types, and type assertions that could be eliminated with better design. It also hunts for duplicated type definitions - the same types defined in multiple packages, similar types with different names, and type aliases that could be unified.

Using grep patterns and Serena’s semantic analysis, it discovers type definitions, identifies semantic duplicates, analyzes untyped usage patterns, and generates refactoring recommendations.

Typist also uses the ResearchPlanAssignOps pattern. This means the job of Typist is not to fix code, but to analyze code and recommend possible improvements.

Let’s take a look at an example of this in practice:

Typist created the Typist - Go Type Consistency Analysis Report. This used grep and other tools to perform a comprehensive analysis examining 208 non-test Go files.
The report found 477 instances of map[string]any usage, 36 untyped constants and 30+ uses any in function signatures.
Peli requested /plan on that issue, causing the Plan agent to do further research and create 5 issues for work to be done such as Create unified ToolsConfig struct in tools_types.go.
4/5 of these issues were then solved by Copilot. For example Add unified ToolsConfig struct to replace map[string]any pattern.
Through this multi-agent causal chain, Typist has produced 19 merged PRs out of 25 proposed (76% merge rate) from 57 discussions → 22 issues → 25 PRs. The blog example (Discussion #4082 → Issue #4155 → PR #4158) is a verified causal chain.

The static v. dynamic typing debate has raged for decades. Today’s hybrid languages like Go, C#, TypeScript and F# support both strong and dynamic typing. Continuous typing improvement offers a new and refreshing perspective on this old debate: rather than enforcing strict typing upfront, we can develop quickly with flexibility, then let autonomous agents like Typist trail behind, strengthening type safety over time. This allows us to get the best of both worlds: rapid development without getting bogged down in type design, while still achieving strong typing and safety as the codebase matures.

Functional Pragmatist: The Pragmatic Purist 
Functional Pragmatist applies moderate functional programming techniques to improve code clarity and safety, balancing pragmatism with functional principles.

The workflow focuses on seven patterns: immutability, functional initialization, transformative operations (map/filter/reduce), functional options pattern, avoiding shared mutable state, pure functions, and reusable logic wrappers.

It searches for opportunities (mutable variables, imperative loops, initialization anti-patterns, global state), scores by safety/clarity/testability improvements, uses Serena for deep analysis, and implements changes like converting to composite literals, using functional options, eliminating globals, extracting pure functions, and creating reusable wrappers (Retry, WithTiming, Memoize).

The workflow is pragmatic: Go’s simple style is respected, for-loops stay when clearer, and abstraction is added only where it genuinely improves code. It runs Tuesday and Thursday mornings, systematically improving patterns over time.

An example PR from our own use of this workflow is Apply functional programming and immutability improvements.

Functional Pragmatist (originally named “Functional Enhancer”) is a recent addition - so far it has created 2 PRs (both merged, 100% merge rate), demonstrating that its pragmatic approach to functional patterns is well-received.

Repository Quality Improver: The Holistic Analyst
Repository Quality Improver takes the widest view, selecting a different focus area each day to analyze the repository from that perspective.

It uses cache memory to ensure diverse coverage: 60% custom areas (repository-specific concerns), 30% standard categories (code quality, documentation, testing, security, performance), and 10% revisits for consistency.

Standard categories cover fundamentals. Custom areas are repository-specific: error message consistency, CLI flag naming conventions, workflow YAML generation patterns, console output formatting, configuration validation.

The workflow loads recent history, selects the next area, spends 20 minutes on deep analysis, generates discussions with recommendations, and saves state. It looks for cross-cutting concerns that don’t fit neatly into other categories but impact overall quality.

Example reports from our own use of this workflow are:

Repository Quality Improvement - CI/CD Optimization
Repository Quality Improvement Report - Performance.
Through its multi-agent causal chain (59 discussions → 30 issues → 40 PRs), Repository Quality Improver has produced 25 merged PRs out of 40 proposed (62% merge rate), taking a holistic view of quality from multiple angles.

The Power of Continuous Improvement
These workflows complete the autonomous improvement picture: Go Module Usage Expert keeps dependencies fresh, Typist strengthens type safety, Functional Pragmatist applies functional techniques, and Repository Quality Improver maintains coherence.

Combined with earlier workflows, we have agents improving code at every level: line-level output (Terminal Stylist), function-level complexity (Code Simplifier), file-level organization (Semantic Function Refactor), pattern-level consistency (Go Pattern Detector), functional clarity (Functional Pragmatist), type safety (Typist), module dependencies (Go Module Usage Expert), and repository coherence (Repository Quality Improver).

This is the future of code quality: not periodic cleanup sprints, but continuous autonomous improvement across every dimension simultaneously.

Using These Workflows
You can add these workflows to your own repository and remix them. Get going with our Quick Start, then run one of the following:

Go Module Usage Expert:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/go-fan.md

Typist:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/typist.md

Functional Pragmatist:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/main/.github/workflows/functional-programming-enhancer.md

Repository Quality Improver:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/repository-quality-improver.md

Then edit and remix the workflow specifications to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Next Up: Continuous Documentation
Beyond code quality, we need to keep documentation accurate and up-to-date as code evolves. How do we maintain docs that stay current?

Continue reading: Continuous Documentation Workflows →

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
This is part 5 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Continuous Style
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Welcome back to Peli’s Agent Factory!

In our previous posts, we’ve explored how autonomous cleanup agents work continuously in the background, simplifying code and improving structure. Today’s post is dedicated to one agent, and the larger admirable concept it represents: continuously making things beautiful.

A Continuous Style Workflow
Today’s post is dedicated to one agent, and the larger concept it represents: the Terminal Stylist workflow. This agent’s purpose is to make things look better, by reviewing and enhancing the style of command-line interface (CLI) output.

Command-line interfaces are a primary interaction point for developer tools. When output is inconsistent or noisy, it still “works,” but it adds friction. When it’s well-styled, information becomes scannable, color highlights what matters, layouts remain readable across light and dark themes, and the overall experience feels professional.

Under the hood, the workflow looks for non-test Go files with console-related code and patterns such as fmt.Print*, console.*, and Lipgloss usage. It then checks for consistency in formatting helpers (especially for errors), sensible TTY-aware rendering, and accessible color choices. When it finds rough edges, it proposes concrete improvements, such as replacing plain output like fmt.Println("Error: compilation failed") with fmt.Fprintln(os.Stderr, console.FormatErrorMessage("Compilation failed")), or swapping ad-hoc ANSI coloring for adaptive Lipgloss styles.

Rather than opening issues or PRs, the Terminal Stylist posts GitHub Discussions in the “General” category. Styling changes are often subjective, and discussions make it easier to converge on the right balance between simplicity and polish.

Terminal Stylist demonstrates multi-agent collaboration at its best. The workflow created 31 daily analysis reports as discussions, which were then mined by Discussion Task Miner and Plan Command into 25 actionable issues. Those issues spawned 16 merged PRs (80% merge rate) improving console output across the codebase - from Charmbracelet best practices adoption to progress bars to stderr routing fixes. Terminal Stylist never creates PRs directly; instead, it identifies opportunities that other agents implement, showing how workflows can collaborate through GitHub’s discussion → issue → PR pipeline.

The Terminal Stylist is proof that autonomous cleanup agents can have surprisingly specific taste. It focuses on terminal UI craft, using the Charmbracelet ecosystem (especially Lipgloss and Huh) to keep the CLI not just correct, but pleasant to use.

The Art of Continuous Style
The Terminal Stylist shows that autonomous improvement isn’t limited to structure and correctness; it also covers user experience. By continuously reviewing output patterns, it helps new features match the project’s visual language, keeps styling aligned with evolving libraries, and nudges the CLI toward accessibility and clarity.

This is especially useful in AI-assisted development, where quick suggestions tend to default to fmt.Println. The Terminal Stylist cleans up after the AI, bringing that output back in line with the project’s conventions.

Continuous Style is a new frontier in code quality. It recognizes that how code looks matters just as much as how it works. By automating style reviews, we ensure that every interaction with our tools feels polished and professional.

Using These Workflows
You can add this workflow to your own repository and remix it as follows:

Terminal Stylist:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/terminal-stylist.md

Then edit and remix the workflow specification to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Next Up: Continuous Improvement
Beyond simplicity, structure, and style, there’s a final dimension: holistic quality improvement. How do we analyze dependencies, type safety, and overall repository health?

Continue reading: Continuous Improvement Workflows →

Learn More
Learn more about GitHub Agentic Workflows, try the Quick Start guide, and explore Charmbracelet, the terminal UI ecosystem referenced by the Terminal Stylist.

This is part 4 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Continuous Refactoring
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Welcome back to Peli’s Agent Factory!

In our previous post, we met automated agents that detect complexity and propose simpler solutions. These work tirelessly in the background, cleaning things up. Now let’s explore similar agents that take a deeper structural view, extending the automation to structural refactoring.

Continuous Refactoring
Our next two agents continuously analyze code structure, suggesting systematic improvements:

Semantic Function Refactor - Spots refactoring opportunities we might have missed
Large File Simplifier - Monitors file sizes and proposes splitting oversized files
The Semantic Function Refactor workflow combines agentic AI with code analysis tools to analyze and address the structure of the entire codebase. It analyzes all Go source files in the pkg/ directory to identify functions that might be in the wrong place.

As codebases evolve, functions sometimes end up in files where they don’t quite belong. Humans struggle to notice these organizational issues because we work on one file at a time and focus on making code work rather than on where it lives.

The workflow performs comprehensive discovery by

algorithmically collecting all function names from non-test Go files, then
agentically grouping functions semantically by name and purpose.
It then identifies functions that don’t fit their current file’s theme as outliers, uses Serena-powered semantic code analysis to detect potential duplicates, and creates issues recommending consolidated refactoring. These issues can then be reviewed and addressed by coding agents.

The workflow follows a “one file per feature” principle: files should be named after their primary purpose, and functions within each file should align with that purpose. It closes existing open issues with the [refactor] prefix before creating new ones. This prevents issue accumulation and ensures recommendations stay current.

In our extended use of Semantic Function Refactoring, the workflow has driven 112 merged PRs out of 142 proposed (79% merge rate) through causal chains - creating 99 refactoring issues that downstream agents turn into code changes. For example, issue #12291 analyzing code organization opportunities led to PR #12363 splitting permissions.go into focused modules (928→133 lines).

An example PR from our own use of this workflow is Move misplaced extraction functions to frontmatter_extraction.go.

Large File Simplifier: The Size Monitor
Large files are a common code smell - they often indicate unclear boundaries, mixed responsibilities, or accumulated complexity. The Large File Simplifier workflow monitors file sizes daily and creates actionable issues when files grow too large.

The workflow runs on weekdays, analyzing all Go source files in the pkg/ directory. It identifies the largest file, checks if it exceeds healthy size thresholds, and creates a detailed issue proposing how to split it into smaller, more focused files.

What makes this workflow effective is its focus and prioritization. Instead of overwhelming developers with issues about every large file, it creates at most one issue, targeting the largest offender. The workflow also skips if an open [file-diet] issue already exists, preventing duplicate work.

In our extended use, Large File Simplifier (also known as “Daily File Diet”) has driven 26 merged PRs out of 33 proposed (79% merge rate) through causal chains - creating 37 file-diet issues targeting the largest files, which downstream agents turn into modular code changes. For example, issue #12535 targeting add_interactive.go led to PR #12545 refactoring it into 6 domain-focused modules.

The workflow uses Serena for semantic code analysis to understand function relationships and propose logical boundaries for splitting. It both counts lines and analyzes the code structure to suggest meaningful module boundaries that make sense.

The Power of Continuous Refactoring
These workflows demonstrate how AI agents can continuously maintain institutional knowledge about code organization. The benefits compound over time: better organization makes code easier to find, consistent patterns reduce cognitive load, reduced duplication improves maintainability, and clean structure attracts further cleanliness. They’re particularly valuable in AI-assisted development, where code gets written quickly and organizational concerns can take a backseat to functionality.

Using These Workflows
You can add these workflows to your own repository and remix them. Get going with our Quick Start, then run one of the following:

Semantic Function Refactor:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/semantic-function-refactor.md

Large File Simplifier:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/daily-file-diet.md

Then edit and remix the workflow specifications to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Next Up: Continuous Style
Beyond structure and organization, there’s another dimension of code quality: presentation and style. How do we maintain beautiful, consistent console output and formatting?

Continue reading: Meet the Workflows: Continuous Style →

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
This is part 3 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Continuous Simplicity
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Ah, what marvelous timing! Come, come, let me show you the next wonders in Peli’s Agent Factory!

In our previous post, we explored how a simple triage workflow helps us stay on top of incoming activity - automatically labeling issues and reducing cognitive load.

Now let’s meet the agents that work quietly in the background to keep code simple and clean. These workflows embody a powerful principle: code quality is not a destination, it’s a continuous practice. While developers race ahead implementing features and fixing bugs, autonomous cleanup agents trail behind, constantly sweeping, polishing, and simplifying. Let’s meet the agents that hunt for complexity.

Continuous Simplicity
The next two agents represent different aspects of code simplicity: detecting overcomplicated code and duplicated logic:

Automatic Code Simplifier - Analyzes recently modified code and creates PRs with simplifications
Duplicate Code Detector - Uses Serena’s semantic analysis to identify duplicate code patterns
The Automatic Code Simplifier runs daily, analyzing recently modified code for opportunities to simplify without changing functionality. It looks at what changed in the last few commits and asks: “Could this be clearer? Could it be shorter? Could it be more idiomatic?”

This workflow is particularly valuable after rapid development sessions. When you’re racing to implement a feature or fix a bug, code often becomes more complex than necessary. Variables get temporary names, logic becomes nested, error handling gets verbose. The workflow tirelessly cleans up after these development sessions, creating PRs that preserve functionality while improving clarity, consistency, and maintainability.

The kinds of simplifications it proposes range from extracting repeated logic into helper functions to converting nested if-statements to early returns. It spots opportunities to simplify boolean expressions, use standard library functions instead of custom implementations, and consolidate similar error handling patterns.

Code Simplifier is a recent addition - so far it has created 6 PRs (5 merged, 83% merge rate), such as extracting an action mode helper to reduce code duplication and simplifying validation config code for clarity.

The Duplicate Code Detector uses traditional, road-tested semantic code analysis in conjunction with agentic reasoning to find duplicate patterns. It understands code meaning rather than just textual similarity, catching patterns where:

The same logic appears with different variable names
Similar functions exist across different files
Repeated patterns could be extracted into utilities
Structure is duplicated even if implementation differs
What makes this workflow special is its use of semantic analysis through Serena - a powerful coding agent toolkit capable of turning an LLM into a fully-featured agent that works directly on your codebase. When we use Serena, we understand code at the compiler-resolved level, not just syntax.

The workflow focuses on recent changes in the latest commits, intelligently filtering out test files, workflows, and non-code files. It creates issues only for significant duplication: patterns spanning more than 10 lines or appearing in 3 or more locations. It performs a multi-phase analysis. It starts by setting up Serena’s semantic environment for the repository, then finds changed .go and .cjs files while excluding tests and workflows. Using get_symbols_overview and find_symbol, it understands structure, identifies similar function signatures and logic blocks, and compares symbol overviews across files for deeper similarities. It creates issues with the [duplicate-code] prefix and limits itself to 3 issues per run, preventing overwhelm. Issues include specific file references, code snippets, and refactoring suggestions.

In our extended use of Duplicate Code Detector, the agent has raised 76 merged PRs out of 96 proposed (79% merge rate), demonstrating sustained practical value of semantic code analysis. Recent examples include refactoring expired-entity cleanup scripts to share expiration processing and refactoring safe-output update handlers to eliminate duplicate control flow.

Continuous AI for Simplicity - A New Paradigm
Together, these workflows point towards an emerging shift in how we maintain code quality. Instead of periodic “cleanup sprints” or waiting for code reviews to catch complexity, we have agents that clean up after us and continuously monitor and propose improvements. This is especially valuable in AI-assisted development. When developers use AI to write code faster, these cleanup agents ensure speed doesn’t sacrifice simplicity. They understand the same patterns that humans recognize but apply them consistently across the entire codebase, every day.

The workflows never take a day off, never get tired, and never let technical debt accumulate. They embody the principle that good enough can always become better, and that incremental improvements compound over time.

Using These Workflows
You can add these workflows to your own repository and remix them. Get going with our Quick Start, then run one of the following:

Automatic Code Simplifier:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/code-simplifier.md

Duplicate Code Detector:

Terminal window
gh aw add-wizard https://github.com/githubnext/agentics/blob/main/workflows/duplicate-code-detector.md

Then edit and remix the workflow specifications to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Next Up: Continuous Refactoring
Simplification is just the beginning. Beyond removing complexity, we can use agents to continuously improve code in many more ways. Our next posts explore this topic.

Continue reading: Continuous Refactoring →

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
This is part 2 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Meet the Workflows: Issue Triage
Jan 13, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Peli de Halleux
Welcome back to Peli’s Agent Factory!

We’re the GitHub Next team. Over the past months, we’ve built and operated a collection of automated agentic workflows. These aren’t just demos - these are real agents doing actual work in our github/gh-aw repository and others.

Think of this as your guided tour through our agent factory. We’re showcasing the workflows that caught our attention. Every workflow links to its source markdown file, so you can peek under the hood and see exactly how it works.

Starting Simple: Automated Issue Triage
To start the tour, let’s begin with one of the simpler workflows that handles incoming activity - issue triage.

Issue triage represents a “hello world” of automated agentic workflows: practical, immediately useful, relatively simple, and impactful. It’s used as the starter example in other agentic automation technologies like Claude Code in GitHub Actions.

When a new issue is opened, the triage agent analyzes its content, does research in the codebase and other issues, responds with a comment, and applies appropriate labels based on predefined categories. This helps maintainers quickly understand the nature of incoming issues without manual review.

Let’s take a look at the full Issue Triage Agent:

---
timeout-minutes: 5

on:
  issue:
    types: [opened, reopened]

permissions:
  issues: read

tools:
  github:
    toolsets: [issues, labels]

safe-outputs:
  add-labels:
    allowed: [bug, feature, enhancement, documentation, question, help-wanted, good-first-issue]
  add-comment: {}
---

# Issue Triage Agent

List open issues in ${{ github.repository }} that have no labels. For each
unlabeled issue, analyze the title and body, then add one of the allowed
labels: `bug`, `feature`, `enhancement`, `documentation`, `question`,
`help-wanted`, or `good-first-issue`.

Skip issues that:
- Already have any of these labels
- Have been assigned to any user (especially non-bot users)

Do research on the issue in the context of the codebase and, after
adding the label to an issue, mention the issue author in a comment, explain
why the label was added and give a brief summary of how the issue may be
addressed.

Note how concise this is - it’s like reading a to-do list for the agent. The workflow runs whenever a new issue is opened or reopened. It checks for unlabeled issues, analyzes their content, and applies appropriate labels based on content analysis. It even leaves a friendly comment explaining the label choice.

In the frontmatter, we define permissions, tools, and safe outputs. This ensures the agent only has access to what it needs and can’t perform any unsafe actions. The natural language instructions in the body guide the agent’s behavior in a clear, human-readable way.

Issue triage workflows in public repositories may need to process issues from all contributors. By default, min-integrity: approved restricts agent visibility to owners, members, and collaborators. If you are a maintainer in a public repository and need your triage agent to see and label issues from users without push access, set min-integrity: none in your GitHub tools configuration. See Integrity Filtering for security considerations and best practices.

We’ve deliberately kept this workflow ultra-simple. In practice, in your own repo, customization is key. Triage differs in every repository. Tailoring workflows to your specific context will make them more effective. Generic agents are okay, but customized ones are often a better fit.

Using These Workflows
You can add this workflow to your own repository and remix it as follows:

Issue Triage Agent:

Terminal window
gh aw add-wizard https://github.com/github/gh-aw/blob/v0.45.5/.github/workflows/issue-triage-agent.md

Then edit and remix the workflow specification to meet your needs, regenerate the lock file using gh aw compile, and push to your repository. See our Quick Start for further installation and setup instructions.

You can also create your own workflows.

Next Up: Code Quality & Refactoring Workflows
Now that we’ve explored how triage workflows help us stay on top of incoming activity, let’s turn to something far more radical and powerful: agents that continuously improve code.

Continue reading: Continuous Simplicity →

Learn More
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
This is part 1 of a 19-part series exploring the workflows in Peli’s Agent Factory.

Welcome to Peli's Agent Factory
Jan 12, 2026
Don Syme
Don Syme
Peli de Halleux
Peli de Halleux
Mara Kiefer
Mara Kiefer
Featured
Peli de Halleux
Welcome, welcome, WELCOME to Peli’s Agent Factory!

Imagine a software repository where AI agents work alongside your team - not replacing developers, but handling the repetitive, time-consuming tasks that slow down collaboration and forward progress.

Peli’s Agent Factory is our exploration of what happens when you take the design philosophy of “let’s create a new automated agentic workflow for that” as the answer to almost every opportunity that arises! What happens when you max out on automated agentic workflows - when you make and use dozens of specialized, automated AI agentic workflows and use them in practice.

Software development is changing rapidly. This is our attempt to understand how automated agentic AI can make software teams more efficient, collaborative, and more enjoyable.

It’s basically a candy shop chocolate factory of agentic workflows. And we’d like to share it with you.

Let’s explore together!

What Is Peli’s Agent Factory?
Peli’s factory is a collection of automated agentic workflows we use in practice. We have built and operated over 100 automated agentic workflows within the github/gh-aw repository. These were used mostly in the context of the github/gh-aw project itself, but some have also been applied at scale in GitHub internal repositories. These weren’t hypothetical demos - they were working agents that:

Triage incoming issues
Diagnose CI failures
Maintain documentation
Improve test coverage
Monitor security compliance
Optimize workflow efficiency
Execute multi-day projects
Even write poetry to boost team morale
Some workflows are “read-only analysts”. Others proactively propose changes through pull requests. Some are meta-agents that monitor and improve the health of other workflows.

We know we’re taking things to an extreme here. Most repositories won’t need dozens of agentic workflows. No one can read all these outputs (except, of course, another workflow). But by pushing the boundaries, we learned valuable lessons about what works, what doesn’t, and how to design safe, effective agentic workflows that teams can trust and use.

Why Build a Factory?
When we started exploring agentic workflows, we faced a fundamental question: What should repository-level automated agentic workflows actually do?

Rather than trying to build one “perfect” agent, we took a broad, heterogeneous approach:

Embrace diversity - Create many specialized workflows as we identified opportunities
Use them continuously - Run them in real development workflows
Observe what works - Find which patterns work and which fail
Share the knowledge - Catalog the structures that make agents safe and effective
The factory becomes both an experiment and a reference collection - a living library of patterns that others can study, adapt, and remix. Each workflow is written in natural language using Markdown, then converted into secure GitHub Actions that run with carefully scoped permissions with guardrails. Everything is observable, auditable, and remixable.

Meet the Workflows
In our first series, Meet the Workflows, we’ll take you on a tour of the most interesting agents in the factory. Each article is bite-sized. If you’d like to skip ahead, here’s the full list of articles in the series:

Meet a Simple Triage Workflow
Introducing Continuous Simplicity
Introducing Continuous Refactoring
Introducing Continuous Style
Introducing Continuous Improvement
Introducing Continuous Documentation
After that we have a cornucopia of specialized workflow categories for you to dip into:

Meet the Issue & PR Management Workflows
Meet the Fault Investigation Workflows
Meet the Metrics & Analytics Workflows
Meet the Operations & Release Workflows
Meet the Security-related Workflows
Meet the Teamwork & Culture Workflows
Meet the Interactive & ChatOps Workflows
Meet the Testing & Validation Workflows
Meet the Tool & Infrastructure Workflows
Introducing Multi-Phase Improver Workflows
Meet the Organization & Cross-Repo Workflows
Go Deep with Advanced Analytics & ML Workflows
Go Deep with Project Coordination Workflows
Every post comes with instructions about how to add the workflow to your own repository, or customize and remix it to create your own variant.

What We’re Learning
Running this many agents in production is a learning experience! We’ve watched agents succeed spectacularly and fail in instructive ways. Over the next few weeks, we’ll also be sharing what we’ve learned through a series of detailed articles. We’ll be looking at the design and operational patterns we’ve discovered, security lessons, and practical guides for building your own workflows.

To give a taste, some key lessons are emerging:

Repository-level automation is powerful - Agents embedded in the development workflow can have outsized impact
Specialization reveals possibilities - Focused agents allowed us to find more useful applications of automation than a single monolithic coding agent
Guardrails enable innovation - Strict constraints actually make it easier to experiment safely
Meta-agents are valuable - Agents that watch other agents become incredibly valuable
Cost-quality tradeoffs are real - Longer analyses aren’t always better
We’ll dive deeper into these lessons in upcoming articles.

Try It Yourself
Want to start with automated agentic workflows on GitHub? See our Quick Start.

Learn More
Meet the Workflows - The 19-part tour of the workflows
GitHub Agentic Workflows - The technology behind the workflows
Quick Start - How to write and compile workflows
Credits
Peli’s Agent Factory is by GitHub Next, Microsoft Research and collaborators, including Peli de Halleux, Don Syme, Mara Kiefer, Edward Aftandilian, Russell Horton, Jiaxiao Zhou. This is part of GitHub Next’s exploration of Continuous AI - making AI-enriched automation as routine as CI/CD.