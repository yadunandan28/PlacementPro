# ML-Powered Career Guidance Platform 🎓

A **genuine machine learning system** for college placement guidance that goes beyond keyword matching to provide intelligent, personalized career recommendations.

## 🆚 What Makes This ML (vs Your Previous Code)

### Your Previous Code (TF-IDF + Cosine Similarity)
- ❌ No learning - just statistical text matching
- ❌ Keyword-based (misses semantic meaning)
- ❌ No personalization
- ❌ Static recommendations
- ❌ No predictive capability

### This System (Actual ML)
- ✅ **Learns** from historical placement data
- ✅ **Predicts** placement success probability
- ✅ **Forecasts** recruitment timelines
- ✅ **Adapts** to individual student profiles
- ✅ **Semantic understanding** using neural embeddings
- ✅ **Feature engineering** from student data

---

## 🏗️ System Architecture

### Component 1: Semantic Job Matcher
**Technology**: Sentence Transformers (Neural Networks)

**What it does**: 
- Converts job descriptions and student profiles into dense vector embeddings
- Understands semantic similarity (knows "ML Engineer" ≈ "Data Scientist")
- Captures skill relationships (Python relates to Machine Learning)

**Why it's ML**: Uses pre-trained transformer neural networks (BERT-based)

```python
# Example
matcher = SemanticJobMatcher()
matcher.fit(job_postings)
matches = matcher.get_semantic_matches(student_profile)
```

### Component 2: Placement Success Predictor
**Technology**: Gradient Boosting Classifier

**What it does**:
- Learns from historical data: which students got placed where
- Features: CGPA, branch, skills match, projects, internships
- Predicts probability of placement success

**Why it's ML**: Trained model that learns patterns from data, makes predictions on unseen combinations

```python
# Training
predictor = PlacementSuccessPredictor()
predictor.fit(historical_placement_data)

# Prediction
probability = predictor.predict_placement_probability(student_job_pairs)
```

**Example Output**:
```
Feature Importance:
  cgpa                 : 0.32  ← Most important
  skills_match         : 0.28
  has_internship       : 0.18
  num_projects         : 0.12
  branch               : 0.10
```

### Component 3: Recruitment Timeline Predictor
**Technology**: Random Forest Regressor / Histogram Gradient Boosting

**What it does**:
- Learns company-specific recruitment patterns
- Predicts when companies are likely to recruit
- Helps students prepare in advance

**Why it's ML**: Time-series prediction based on historical patterns

```python
# Training
timeline_predictor = RecruitmentTimelinePredictor()
timeline_predictor.fit(historical_recruitment_data)

# Prediction
timeline = timeline_predictor.predict_recruitment_month('Google', 2025)
# Output: "Typically recruits in August"
```

---

## 🚀 Quick Start

### Installation

```bash
# Clone or download the files
cd career-guidance-ml

# Install dependencies
pip install -r requirements.txt

# If sentence-transformers fails, you can still use the system
# It will fall back to improved TF-IDF
```

### Run the Demo

```bash
python demo_career_platform.py
```

This will:
1. Generate synthetic training data
2. Train all ML models
3. Show recommendations for different student profiles
4. Display model insights

### Expected Output

```
============================================================
🚀 Training ML-Powered Career Guidance Platform
============================================================

[1/3] Training Semantic Job Matcher...
🧠 Encoding jobs with sentence transformers...
✓ Encoded 100 jobs
✓ Embedding dimension: 384

[2/3] Training Placement Success Predictor...
🎯 Training placement predictor on 500 samples...

📊 Feature Importance:
  cgpa                 : 0.32
  skills_match         : 0.28
  has_internship       : 0.18
  ...

[3/3] Training Recruitment Timeline Predictor...
📅 Training timeline predictor on 48 records...
✓ Timeline predictor trained

============================================================
✅ Platform ready for recommendations!
============================================================
```

---

## 📊 Using With Your Real Data

### Step 1: Prepare Job Postings

```python
import pandas as pd

job_df = pd.DataFrame({
    'job_id': ['JOB_001', 'JOB_002', ...],
    'job_title': ['Software Engineer', 'Data Scientist', ...],
    'company_name': ['Google', 'Microsoft', ...],
    'required_skills': ['Python, Java, SQL', 'Python, ML, Stats', ...],
    'industry': ['Technology', 'Finance', ...],
    'company_tier': ['Tier1', 'Tier2', ...],  # Optional
    'job_description': ['...', '...', ...]     # Optional
})
```

### Step 2: Prepare Historical Placement Data

```python
placement_df = pd.DataFrame({
    'cgpa': [8.5, 7.2, 9.0, ...],
    'branch': ['CSE', 'IT', 'ECE', ...],
    'backlogs': [0, 1, 0, ...],
    'num_projects': [3, 1, 4, ...],
    'has_internship': [True, False, True, ...],
    'user_skills': ['Python, Java', 'C++, SQL', ...],
    'required_skills': ['Python, Java, SQL', ...],  # From job
    'company_tier': ['Tier1', 'Tier2', ...],
    'placed': [1, 0, 1, ...]  # 1 = placed, 0 = not placed
})
```

### Step 3: Prepare Recruitment Timeline (Optional)

```python
timeline_df = pd.DataFrame({
    'company_name': ['Google', 'Microsoft', ...],
    'year': [2023, 2023, ...],
    'month': [8, 9, ...],  # 1-12
    'company_tier': ['Tier1', 'Tier1', ...],
    'num_positions': [10, 15, ...]
})
```

### Step 4: Train and Use

```python
from career_ml_system import CareerGuidancePlatform

# Initialize
platform = CareerGuidancePlatform()

# Train all models
platform.fit(
    job_postings=job_df,
    placement_history=placement_df,
    recruitment_timeline=timeline_df
)

# Get recommendations
student = {
    'skills': 'Python, Machine Learning, SQL',
    'desired_role': 'Data Scientist',
    'cgpa': 8.5,
    'branch': 'CSE',
    'backlogs': 0,
    'num_projects': 3,
    'has_internship': True
}

recommendations = platform.recommend_jobs(student, top_k=10)
print(recommendations[['job_title', 'company_name', 'final_score', 'placement_probability']])
```

---

## 🎯 Key Features Matching Your Project Vision

### 1. Personalized Roadmaps ✅
```python
skill_path = platform.get_skill_development_path(
    student_profile=student,
    target_job_id='JOB_001'
)
# Returns: matching skills, skills to learn, prep time, priority
```

### 2. Dream Companies & Roles ✅
```python
student = {
    'desired_role': 'ML Engineer',
    'dream_companies': 'Google, Microsoft, Amazon',
    ...
}
# System prioritizes these in recommendations
```

### 3. Past Recruitment Trends ✅
```python
timeline = platform.timeline_predictor.predict_recruitment_month('Google', 2025)
# Output: "Typically recruits in August"
```

### 4. Placement Probability ✅
```python
recommendations['placement_probability']  # 0-100%
# Learned from historical data: which profiles succeeded
```

### 5. Industry Standards Matching ✅
- Semantic matching understands industry terminology
- Learns from actual placement outcomes
- Adapts recommendations to company tiers

---

## 📈 Model Performance Metrics

### What to Track in Production

1. **Recommendation Accuracy**
   - Did student apply to recommended jobs?
   - Did they get selected?
   - Track click-through rate

2. **Placement Predictor**
   ```python
   from sklearn.metrics import classification_report, roc_auc_score
   
   # After getting actual placement results
   y_pred = model.predict(X_test)
   print(classification_report(y_test, y_pred))
   print(f"ROC-AUC: {roc_auc_score(y_test, y_pred_proba)}")
   ```

3. **Timeline Accuracy**
   - Compare predicted months with actual recruitment
   - Mean Absolute Error (MAE) in months

---

## 🔧 Advanced Features to Add

### 1. Skill Taxonomy
```python
# Map related skills
skill_taxonomy = {
    'Python': ['Python3', 'Python Programming'],
    'Machine Learning': ['ML', 'AI', 'Deep Learning'],
    'JavaScript': ['JS', 'TypeScript', 'React', 'Node.js']
}
# Use this to better match skills
```

### 2. Mock Interview Scores
```python
# Add to student profile
student_profile['mock_interview_scores'] = {
    'technical': 85,
    'behavioral': 75,
    'communication': 80
}
# Use as features in placement predictor
```

### 3. Resume Parser
```python
# Extract skills from uploaded resume
from resume_parser import parse_resume
student_skills = parse_resume('student_resume.pdf')
```

### 4. Real-time Updates
```python
# Retrain models periodically
# As new placement data comes in
platform.placement_predictor.partial_fit(new_data)
```

### 5. A/B Testing
```python
# Test different recommendation strategies
# Track which approach leads to better outcomes
```

---

## 🎓 For Your College Project Report

### How to Explain This is ML

**Section 1: Problem Statement**
- Traditional keyword matching fails to capture semantic similarity
- No personalization based on student profile
- Cannot predict placement success
- Missing temporal patterns in recruitment

**Section 2: ML Components**

1. **Neural Embeddings (Transformer-based)**
   - Model: Sentence-BERT
   - Purpose: Semantic job matching
   - Training: Pre-trained on 1B+ sentences, fine-tunable

2. **Supervised Learning (Classification)**
   - Model: Gradient Boosting Classifier
   - Purpose: Placement success prediction
   - Features: CGPA, skills, projects, internships
   - Training: Historical placement records

3. **Supervised Learning (Regression)**
   - Model: Random Forest / Histogram GB
   - Purpose: Timeline prediction
   - Training: Multi-year recruitment data

**Section 3: Why This is ML**
- ✅ Training phase with labeled data
- ✅ Learning patterns from historical data
- ✅ Making predictions on unseen data
- ✅ Model evaluation and validation
- ✅ Feature importance analysis
- ✅ Continuous improvement with new data

**Section 4: Results**
- Show accuracy metrics
- Feature importance plots
- Student testimonials (if available)
- Comparison with baseline (keyword matching)

---

## 🚨 Common Issues & Solutions

### Issue 1: sentence-transformers Installation Fails
**Solution**: System automatically falls back to TF-IDF. Still works but with less semantic understanding.

```bash
# If you have GPU
pip install sentence-transformers

# If you have limited resources
# Just use the TF-IDF fallback (automatic)
```

### Issue 2: Not Enough Training Data
**Solution**: Start with at least:
- 50+ job postings
- 100+ historical placements
- 20+ recruitment timeline records

For the demo, we generate synthetic data. Replace with real data for production.

### Issue 3: Poor Predictions
**Solution**: 
- Add more features (certifications, coding ratings, etc.)
- Collect more training data
- Feature engineering (create interaction features)
- Hyperparameter tuning

---

## 📚 Further Reading

### ML Concepts Used
1. **Sentence Transformers**: [https://www.sbert.net/](https://www.sbert.net/)
2. **Gradient Boosting**: [Scikit-learn Guide](https://scikit-learn.org/stable/modules/ensemble.html#gradient-boosting)
3. **Feature Engineering**: [Applied ML Guide](https://developers.google.com/machine-learning/crash-course/representation/feature-engineering)

### Similar Systems
- LinkedIn Job Recommendations (collaborative filtering)
- Indeed Job Matching (semantic search)
- University Career Services Platforms

---

## 📝 License

This is educational code for your college project. Feel free to modify and extend!

---

## 🤝 Contributing

To improve this system:
1. Add more features (certifications, coding contest ratings)
2. Implement collaborative filtering (user-user, item-item)
3. Add explainability (SHAP values for predictions)
4. Build a web interface (Flask/FastAPI + React)
5. Add resume parsing
6. Implement interview practice tracking

---

## 📧 Support

If you face issues or have questions about implementing this for your project, feel free to ask!

**Remember**: This is a starting point. The real power comes from:
1. Quality training data from your college
2. Continuous model updates
3. Feedback loop from students
4. Integration with existing systems

Good luck with your project! 🎉
