import pandas as pd
from sentence_transformers import SentenceTransformer, util
import torch

# 1. Load Data
# Assuming job_dataset.csv is in the current directory
df = pd.read_csv("/content/drive/MyDrive/job_dataset.csv")

# Handle missing values
df['Required Skills'] = df['Required Skills'].fillna("General Management")

# 2. Initialize Sentence Transformer Model
# 'all-MiniLM-L6-v2' is efficient and accurate for semantic similarity
model = SentenceTransformer('all-MiniLM-L6-v2')

# Pre-compute embeddings for all jobs to speed up search
# This converts text skills into a list of numerical vectors (384 dimensions)
job_skill_embeddings = model.encode(df['Required Skills'].tolist(), convert_to_tensor=True)

def generate_roadmap(student_skills, target_company=None, target_role=None):
    print(f"\n🔵 PROCESSING STUDENT PROFILE: {student_skills}")
    
    # --- Step A: Semantic Matching (The "Smart" Score) ---
    # Encode student skills into a vector
    student_embedding = model.encode(student_skills, convert_to_tensor=True)
    
    # Calculate Cosine Similarity with ALL jobs
    # util.cos_sim returns a matrix of scores between 0 and 1
    cosine_scores = util.cos_sim(student_embedding, job_skill_embeddings)[0]
    
    # Add scores to dataframe temporarily
    df['Match Score'] = cosine_scores.cpu().numpy()
    
    # --- Step B: Smart Recommendations ---
    print("\n✅ TOP RECOMMENDATIONS (Based on Semantic Fit):")
    # Get top 3 matches
    top_matches = df.sort_values(by='Match Score', ascending=False).head(3)
    for idx, row in top_matches.iterrows():
        print(f"   - {row['Company']} ({row['Job Title']}) | Match: {row['Match Score']*100:.1f}%")
        print(f"     Skills Req: {row['Required Skills']}")

    # --- Step C: The "Gap" Report & Roadmap ---
    if target_company:
        print(f"\n🚀 GAP ANALYSIS FOR TARGET: {target_company}")
        
        # Filter for the target job
        target_jobs = df[df['Company'].str.contains(target_company, case=False, na=False)]
        if target_role:
             target_jobs = target_jobs[target_jobs['Job Title'].str.contains(target_role, case=False, na=False)]
        
        if target_jobs.empty:
            print("   ❌ Target Company/Role not found in database.")
            return

        # Pick the best matching role within that company
        best_target_idx = target_jobs['Match Score'].idxmax()
        target_job = target_jobs.loc[best_target_idx]
        
        current_score = target_job['Match Score'] * 100
        print(f"   🎯 Role: {target_job['Job Title']}")
        print(f"   📊 Current Match: {current_score:.1f}%")
        
        # --- Advanced Gap Detection ---
        # Instead of simple string matching, we check semantic similarity for EACH skill
        req_skills_list = [s.strip() for s in target_job['Required Skills'].split(',')]
        student_skills_list = [s.strip() for s in student_skills.split(',')]
        
        missing_skills = []
        
        # Encode student individual skills for comparison
        student_list_emb = model.encode(student_skills_list, convert_to_tensor=True)
        
        for req_skill in req_skills_list:
            req_emb = model.encode(req_skill, convert_to_tensor=True)
            # Find the max similarity of this required skill against ALL student skills
            max_sim = util.cos_sim(req_emb, student_list_emb).max().item()
            
            # If similarity is low (< 0.6), consider it missing
            if max_sim < 0.6:
                missing_skills.append(req_skill)
        
        if missing_skills:
            print(f"   ⚠️  CRITICAL SKILLS GAP: You need to learn these to reach 100%:")
            for skill in missing_skills:
                print(f"      👉 {skill}")
            
            # Generate the Roadmap Statement
            print(f"\n   🗺️  YOUR ROADMAP:")
            print(f"      1. Start with '{missing_skills[0]}' as it's the core requirement.")
            if len(missing_skills) > 1:
                print(f"      2. Then build a project using '{missing_skills[1]}' to demonstrate competency.")
            print(f"      3. Apply to {target_company} once you complete these modules.")
        else:
            print("   🎉 You are fully qualified! Apply immediately.")

# --- EXECUTION FOR RAHUL ---
# Scenario: Rahul knows Python, Java, SQL. He wants to join "Williams LLC" as an Archaeologist.
# --- TEST SUITE: RUNNING VARIOUS SCENARIOS ---

test_cases = [
    {
        "name": "Scenario 1: Semantic Match (AI vs Machine Learning)",
        "skills": "Python",
        "company": "Collins Inc",
        "role": "Designer, exhibition/display"
    },
    {
        "name": "Scenario 2: Gap Analysis (Missing Risk Analysis)",
        "skills": "Financial Modeling, Excel",
        "company": "Dawson-Hudson",
        "role": "Early years teacher"
    },
    {
        "name": "Scenario 3: Perfect Match",
        "skills": "SEO, Google Ads, Content Writing",
        "company": "Ramos, Santiago and Stewart",
        "role": "Counselling psychologist"
    },
    {
        "name": "Scenario 4: Unrelated / Low Match",
        "skills": "Cooking, Painting, Art",
        "company": "Williams LLC",
        "role": "Archaeologist"
    }
]

print("==========================================")
print("       RUNNING AUTOMATED TEST CASES       ")
print("==========================================\n")

for test in test_cases:
    print(f"\n🔹 TESTING: {test['name']}")
    print(f"   Input Skills: {test['skills']}")
    print(f"   Target: {test['company']}")
    
    # Call the main function
    generate_roadmap(
        student_skills=test['skills'],
        target_company=test['company'],
        target_role=test['role']
    )
    print("-" * 60)