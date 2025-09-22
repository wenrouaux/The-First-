"""
CNHK MCP Server - A comprehensive Model Context Protocol server for quantitative trading platform integration.
"""

from .untracked.platform_functions import (
    BrainApiClient,
    authenticate,
    create_simulation,
    get_simulation_status,
    wait_for_simulation,
    get_alpha_details,
    get_datasets,
    get_datafields,
    get_alpha_pnl,
    get_user_alphas,
    submit_alpha,
    get_events,
    get_leaderboard,
    batch_process_alphas,
    analyze_alpha_performance,
    get_operators,
    run_selection,
    get_user_profile,
    get_tutorials,
    get_messages_summary,
    get_messages,
    get_alpha_record_sets,
    check_production_correlation,
    check_self_correlation,
    get_submission_check,
    set_alpha_properties,
    get_user_activities,
    get_pyramid_multipliers,
    get_pyramid_alphas,
    get_user_competitions,
    get_competition_details,
    get_competition_agreement,
    get_instrument_options,
    performance_comparison,
    combine_test_results,
    generate_alpha_links,
    get_tutorial_page,
    get_tutorial_badge_status
)

from .untracked.forum_functions import (
    ForumClient,
    get_glossary_terms,
    search_forum_posts,
    read_full_forum_post
)

__version__ = "1.4.8"
__author__ = "CNHK"
__email__ = "cnhk@example.com"

__all__ = [
    # Main API client
    "BrainApiClient",
    
    # Authentication
    "authenticate",
    
    # Simulation management
    "create_simulation",
    "get_simulation_status",
    "wait_for_simulation",
    
    # Alpha management
    "get_alpha_details",
    "submit_alpha",
    "get_user_alphas",
    "get_alpha_pnl",
    "get_alpha_record_sets",
    "set_alpha_properties",
    "check_production_correlation",
    "check_self_correlation",
    "get_submission_check",
    
    # Data access
    "get_datasets",
    "get_datafields",
    "get_operators",
    "run_selection",
    "get_instrument_options",
    
    # Performance analysis
    "analyze_alpha_performance",
    "performance_comparison",
    "combine_test_results",
    
    # User management
    "get_user_profile",
    "get_user_activities",
    "get_user_competitions",
    
    # Competition and events
    "get_events",
    "get_leaderboard",
    "get_competition_details",
    "get_competition_agreement",
    
    # Pyramid system
    "get_pyramid_multipliers",
    "get_pyramid_alphas",
    
    # Tutorials and documentation
    "get_tutorials",
    "get_tutorial_page",
    "get_tutorial_badge_status",
    
    # Messages
    "get_messages_summary",
    "get_messages",
    
    # Utilities
    "batch_process_alphas",
    "generate_alpha_links",
    
    # Forum functionality
    "ForumClient",
    "get_glossary_terms",
    "search_forum_posts",
    "read_full_forum_post"
] 