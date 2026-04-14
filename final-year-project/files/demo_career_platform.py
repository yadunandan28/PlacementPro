"""
Demo: ML-Powered Career Guidance Platform
==========================================
This script demonstrates the complete workflow with synthetic data.
"""

import pandas as pd
import numpy as np
from career_ml_system import CareerGuidancePlatform
import warnings
warnings.filterwarnings('ignore')

# Set random seed for reproducibility
np.random.seed(42)


def generate_synthetic_data():
    """
    Generate realistic synthetic data for demonstration.
    In production, this would come from your actual database.
    """
    
    # 1. JOB POSTINGS DATA
    companies = ['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix', 
                'Goldman Sachs', 'JP Morgan', 'Flipkart', 'Zomato', 
                'Swiggy', 'Paytm', 'TCS', 'Infosys', 'Wipro', 'Accenture']
    
    roles = ['Software Engineer', 'Data Scientist', 'Machine Learning Engineer',
            'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
            'DevOps Engineer', 'Product Manager', 'Data Analyst', 'Business Analyst']
    
    skill_sets = {
        'Software Engineer': 'Python, Java, Data Structures, Algorithms, System Design, Git',
        'Data Scientist': 'Python, Machine Learning, Statistics, SQL, Pandas, Scikit-learn',
        'Machine Learning Engineer': 'Python, Deep Learning, TensorFlow, PyTorch, MLOps, Docker',
        'Frontend Developer': 'JavaScript, React, HTML, CSS, TypeScript, Redux',
        'Backend Developer': 'Java, Python, Spring Boot, REST API, Database, Microservices',
        'Full Stack Developer': 'JavaScript, React, Node.js, MongoDB, Python, REST API',
        'DevOps Engineer': 'Docker, Kubernetes, AWS, CI/CD, Linux, Terraform',
        'Product Manager': 'Product Strategy, Analytics, SQL, A/B Testing, Agile',
        'Data Analyst': 'SQL, Excel, Tableau, Python, Statistics, Business Intelligence',
        'Business Analyst': 'SQL, Excel, Requirements Analysis, Agile, Stakeholder Management'
    }
    
    industries = ['Technology', 'Finance', 'E-commerce', 'Consulting', 'Product']
    company_tiers = ['Tier1', 'Tier2', 'Tier3']
    
    # Generate 100 job postings
    jobs = []
    for i in range(100):
        role = np.random.choice(roles)
        company = np.random.choice(companies)
        
        job = {
            'job_id': f'JOB_{i+1:03d}',
            'job_title': role,
            'company_name': company,
            'required_skills': skill_sets[role],
            'industry': np.random.choice(industries),
            'company_tier': company_tiers[0] if company in ['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple'] 
                           else company_tiers[1] if company in ['Goldman Sachs', 'JP Morgan', 'Netflix']
                           else company_tiers[2],
            'job_description': f'Looking for a talented {role} to join our team. Must have strong skills in {skill_sets[role].split(",")[0]}.',
            'min_cgpa': np.random.choice([6.5, 7.0, 7.5, 8.0]),
            'location': np.random.choice(['Bangalore', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi'])
        }
        jobs.append(job)
    
    job_df = pd.DataFrame(jobs)
    
    # 2. HISTORICAL PLACEMENT DATA (for training the placement predictor)
    branches = ['CSE', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil']
    
    placements = []
    for i in range(500):
        cgpa = np.random.uniform(6.0, 10.0)
        branch = np.random.choice(branches, p=[0.3, 0.25, 0.2, 0.1, 0.1, 0.05])
        backlogs = np.random.choice([0, 0, 0, 1, 2], p=[0.6, 0.2, 0.1, 0.07, 0.03])
        num_projects = np.random.randint(0, 6)
        has_internship = np.random.choice([True, False], p=[0.4, 0.6])
        
        # Pick a random job
        job_idx = np.random.randint(0, len(jobs))
        job = jobs[job_idx]
        
        # Simulate skill matching
        all_skills = ['Python', 'Java', 'C++', 'JavaScript', 'Machine Learning', 
                     'Data Structures', 'SQL', 'React', 'AWS', 'Docker']
        num_skills = np.random.randint(3, 8)
        user_skills = ','.join(np.random.choice(all_skills, num_skills, replace=False))
        
        # Calculate placement probability based on features
        # Higher CGPA, relevant branch, projects, internship → higher chance
        base_prob = 0.3
        if cgpa > 8.0:
            base_prob += 0.2
        if branch in ['CSE', 'IT']:
            base_prob += 0.15
        if backlogs == 0:
            base_prob += 0.1
        if num_projects >= 2:
            base_prob += 0.1
        if has_internship:
            base_prob += 0.15
        
        placed = np.random.random() < base_prob
        
        placement = {
            'student_id': f'STU_{i+1:03d}',
            'cgpa': cgpa,
            'branch': branch,
            'backlogs': backlogs,
            'num_projects': num_projects,
            'has_internship': has_internship,
            'user_skills': user_skills,
            'required_skills': job['required_skills'],
            'company_tier': job['company_tier'],
            'placed': int(placed)
        }
        placements.append(placement)
    
    placement_df = pd.DataFrame(placements)
    
    # 3. RECRUITMENT TIMELINE DATA
    timelines = []
    for company in companies:
        for year in [2022, 2023, 2024]:
            # Most companies recruit in July-September (campus season)
            month = np.random.choice([7, 8, 9, 10], p=[0.3, 0.4, 0.2, 0.1])
            
            timeline = {
                'company_name': company,
                'year': year,
                'month': month,
                'company_tier': company_tiers[0] if company in ['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple'] 
                               else company_tiers[1] if company in ['Goldman Sachs', 'JP Morgan', 'Netflix']
                               else company_tiers[2],
                'num_positions': np.random.randint(5, 50)
            }
            timelines.append(timeline)
    
    timeline_df = pd.DataFrame(timelines)
    
    return job_df, placement_df, timeline_df


def demo_basic_workflow():
    """Demonstrate the basic workflow of the platform."""
    
    print("\n" + "="*80)
    print("DEMO: ML-POWERED CAREER GUIDANCE PLATFORM")
    print("="*80)
    
    # Step 1: Generate data
    print("\n📊 Generating synthetic data...")
    job_df, placement_df, timeline_df = generate_synthetic_data()
    
    print(f"  ✓ {len(job_df)} job postings")
    print(f"  ✓ {len(placement_df)} historical placements")
    print(f"  ✓ {len(timeline_df)} recruitment timeline records")
    
    # Step 2: Initialize and train the platform
    print("\n🎓 Initializing Career Guidance Platform...")
    platform = CareerGuidancePlatform()
    
    platform.fit(
        job_postings=job_df,
        placement_history=placement_df,
        recruitment_timeline=timeline_df
    )
    
    # Step 3: Create a student profile
    student_profile = {
        'skills': 'Python, Machine Learning, Data Structures, Algorithms, SQL',
        'desired_role': 'Machine Learning Engineer',
        'cgpa': 8.5,
        'branch': 'CSE',
        'backlogs': 0,
        'num_projects': 3,
        'has_internship': True,
        'dream_companies': 'Google, Microsoft, Amazon',
        'interests': 'Deep Learning, Computer Vision'
    }
    
    print("\n" + "-"*80)
    print("👨‍🎓 STUDENT PROFILE")
    print("-"*80)
    for key, value in student_profile.items():
        print(f"  {key:20s}: {value}")
    
    # Step 4: Get recommendations
    print("\n" + "-"*80)
    print("🎯 PERSONALIZED JOB RECOMMENDATIONS")
    print("-"*80)
    
    recommendations = platform.recommend_jobs(
        student_profile=student_profile,
        top_k=10,
        include_timeline=True
    )
    
    # Display top 5 recommendations
    print("\nTop 5 Recommended Jobs:\n")
    display_cols = ['job_title', 'company_name', 'final_score', 
                   'placement_probability', 'expected_recruitment']
    
    for idx, row in recommendations.head(5).iterrows():
        print(f"{idx+1}. {row['job_title']} at {row['company_name']}")
        print(f"   Match Score: {row['final_score']:.1f}/100")
        if row['placement_probability'] is not None:
            print(f"   Placement Probability: {row['placement_probability']:.1f}%")
        if 'expected_recruitment' in row:
            print(f"   Expected Recruitment: {row['expected_recruitment']}")
        print()
    
    # Step 5: Skill gap analysis
    print("-"*80)
    print("📚 SKILL GAP ANALYSIS")
    print("-"*80)
    
    target_job_id = recommendations.iloc[0]['job_id']
    skill_path = platform.get_skill_development_path(
        student_profile=student_profile,
        target_job_id=target_job_id
    )
    
    print(f"\nTarget Job: {skill_path['job_title']} at {skill_path['company']}")
    print(f"Match Percentage: {skill_path['match_percentage']:.1f}%")
    print(f"Priority: {skill_path['priority']}")
    print(f"\nYour Skills: {', '.join(skill_path['your_skills'][:5])}...")
    print(f"Matching Skills: {', '.join(skill_path['matching_skills']) if skill_path['matching_skills'] else 'None'}")
    print(f"Skills to Learn: {', '.join(skill_path['skills_to_learn']) if skill_path['skills_to_learn'] else 'None'}")
    print(f"Estimated Prep Time: {skill_path['estimated_prep_time']}")
    
    # Step 6: Save models
    print("\n" + "-"*80)
    print("💾 SAVING MODELS")
    print("-"*80)
    platform.save_models()
    
    print("\n" + "="*80)
    print("✅ DEMO COMPLETED SUCCESSFULLY")
    print("="*80)
    
    return platform, job_df, placement_df, recommendations


def demo_multiple_students():
    """Show recommendations for different student profiles."""
    
    print("\n" + "="*80)
    print("DEMO: COMPARING RECOMMENDATIONS FOR DIFFERENT STUDENTS")
    print("="*80)
    
    # Generate data
    job_df, placement_df, timeline_df = generate_synthetic_data()
    
    # Train platform
    platform = CareerGuidancePlatform()
    platform.fit(job_df, placement_df, timeline_df)
    
    # Define different student profiles
    students = [
        {
            'name': 'High Achiever',
            'profile': {
                'skills': 'Python, Java, Machine Learning, Deep Learning, TensorFlow, AWS',
                'desired_role': 'Machine Learning Engineer',
                'cgpa': 9.2,
                'branch': 'CSE',
                'backlogs': 0,
                'num_projects': 5,
                'has_internship': True,
                'dream_companies': 'Google, Microsoft'
            }
        },
        {
            'name': 'Average Student',
            'profile': {
                'skills': 'Python, SQL, Java, HTML, CSS',
                'desired_role': 'Software Engineer',
                'cgpa': 7.5,
                'branch': 'IT',
                'backlogs': 1,
                'num_projects': 2,
                'has_internship': False,
                'dream_companies': 'Infosys, TCS'
            }
        },
        {
            'name': 'Career Switcher',
            'profile': {
                'skills': 'Circuit Design, VLSI, C++, Python',
                'desired_role': 'Software Engineer',
                'cgpa': 8.0,
                'branch': 'ECE',
                'backlogs': 0,
                'num_projects': 1,
                'has_internship': False,
                'dream_companies': 'Amazon, Flipkart'
            }
        }
    ]
    
    # Get recommendations for each
    for student in students:
        print(f"\n{'='*80}")
        print(f"Student: {student['name']}")
        print(f"{'='*80}")
        
        recommendations = platform.recommend_jobs(
            student_profile=student['profile'],
            top_k=3,
            include_timeline=False
        )
        
        print("\nTop 3 Recommendations:\n")
        for idx, row in recommendations.iterrows():
            print(f"{idx+1}. {row['job_title']} at {row['company_name']}")
            print(f"   Match Score: {row['final_score']:.1f}/100")
            if row['placement_probability'] is not None:
                print(f"   Placement Success Probability: {row['placement_probability']:.1f}%")
            print()


def show_model_insights():
    """Display insights about what the models learned."""
    
    print("\n" + "="*80)
    print("DEMO: MODEL INSIGHTS & FEATURE IMPORTANCE")
    print("="*80)
    
    # Generate data and train
    job_df, placement_df, timeline_df = generate_synthetic_data()
    platform = CareerGuidancePlatform()
    platform.fit(job_df, placement_df, timeline_df)
    
    print("\n📊 What the models learned:")
    print("\n1. Semantic Matcher:")
    print("   - Understands job role similarities (e.g., 'ML Engineer' ≈ 'Data Scientist')")
    print("   - Captures skill relationships (e.g., 'Python' relates to 'Machine Learning')")
    print("   - Considers company preferences in matching")
    
    print("\n2. Placement Predictor:")
    print("   - Learned which combinations of CGPA, branch, skills lead to success")
    print("   - Identifies importance of internships and projects")
    print("   - Understands company tier requirements")
    
    print("\n3. Timeline Predictor:")
    print("   - Learned seasonal recruitment patterns")
    print("   - Company-specific hiring schedules")
    
    # Show some predictions
    print("\n📅 Sample Timeline Predictions:")
    for company in ['Google', 'Microsoft', 'TCS']:
        timeline = platform.timeline_predictor.predict_recruitment_month(company, 2025)
        print(f"   {company}: {timeline['message']}")


if __name__ == "__main__":
    print("\n🎯 Starting Career Guidance Platform Demo\n")
    print("This demo will show:")
    print("  1. Basic workflow with a student profile")
    print("  2. Recommendations for different student types")
    print("  3. Model insights and predictions")
    print("\n" + "="*80)
    
    # Run demos
    try:
        # Demo 1: Basic workflow
        platform, jobs, placements, recommendations = demo_basic_workflow()
        
        # Demo 2: Multiple students
        demo_multiple_students()
        
        # Demo 3: Model insights
        show_model_insights()
        
        print("\n" + "="*80)
        print("🎉 ALL DEMOS COMPLETED SUCCESSFULLY!")
        print("="*80)
        print("\nNext Steps:")
        print("  1. Replace synthetic data with your actual college placement data")
        print("  2. Fine-tune model parameters based on performance")
        print("  3. Add more features (certifications, coding contest ratings, etc.)")
        print("  4. Build a web interface for students to interact with the system")
        print("  5. Continuously update models as new placement data comes in")
        
    except Exception as e:
        print(f"\n❌ Error in demo: {str(e)}")
        import traceback
        traceback.print_exc()
